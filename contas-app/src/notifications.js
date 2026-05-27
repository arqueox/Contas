import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

// Deterministic integer ID from bill ID + offset (fits 32-bit signed int)
function notifId(billId, daysBefore) {
  let h = 5381
  const s = billId + ':' + daysBefore
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 2100000000
}

// ── Notification channel (Android 8+) ───────────────────────────────────
export async function createChannel() {
  if (!isNative) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id: 'contas',
      name: 'Lembretes de contas',
      description: 'Avisos de pagamentos próximos',
      importance: 4,   // HIGH
      visibility: 1,
      vibration: true,
      sound: 'default',
    })
  } catch (e) { console.warn('createChannel:', e) }
}

// ── Request permissions ──────────────────────────────────────────────────
export async function requestNotifPermission() {
  if (!isNative) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch { return false }
}

// ── Cancel all notifications for a bill ─────────────────────────────────
export async function cancelBillNotifs(billId) {
  if (!isNative) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const ids = [0, 1, 2, 3, 7, 14].map(d => ({ id: notifId(billId, d) }))
    await LocalNotifications.cancel({ notifications: ids })
  } catch {}
}

// ── Schedule notifications for a bill ───────────────────────────────────
export async function scheduleBillNotifs(bill, settings, nextDueFn, fmtEur) {
  if (!isNative || !settings.enabled) return
  await cancelBillNotifs(bill.id)

  const due = nextDueFn(bill)
  const now = new Date()
  const notifications = []

  for (const daysBefore of (settings.daysBefore || [1])) {
    const at = new Date(due)
    at.setDate(at.getDate() - daysBefore)
    at.setHours(settings.hour ?? 9, 0, 0, 0)
    if (at <= now) continue

    let title, body
    if (daysBefore === 0) {
      title = `💳 ${bill.name} — Hoje`
      body  = `Vence hoje · ${fmtEur(bill.amount)}`
    } else if (daysBefore === 1) {
      title = `🔔 ${bill.name} — Amanhã`
      body  = `Vence amanhã · ${fmtEur(bill.amount)}`
    } else {
      title = `📅 ${bill.name}`
      body  = `Vence em ${daysBefore} dias · ${fmtEur(bill.amount)}`
    }

    notifications.push({
      id: notifId(bill.id, daysBefore),
      title,
      body,
      channelId: 'contas',
      schedule: { at, allowWhileIdle: true },
      extra: { billId: bill.id, daysBefore },
    })
  }

  if (notifications.length === 0) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({ notifications })
    return notifications.length
  } catch (e) { console.warn('schedule:', e) }
}

// ── Push Notifications (FCM) ─────────────────────────────────────────────
export async function initPushNotifications(backendUrl, onToken) {
  if (!isNative || !backendUrl) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    await PushNotifications.requestPermissions()
    await PushNotifications.register()

    PushNotifications.addListener('registration', async ({ value: token }) => {
      console.log('FCM token:', token)
      onToken?.(token)
      if (backendUrl) {
        try {
          await fetch(`${backendUrl}/api/register-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'android' }),
          })
        } catch (e) { console.warn('register-device failed:', e) }
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received (foreground):', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push tapped:', action)
    })
  } catch (e) { console.warn('initPush:', e) }
}
