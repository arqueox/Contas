# ── AndroidManifest.xml ───────────────────────────────────────────────────
# Adicionar dentro de <manifest> (antes de <application>):

    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <!-- Android 12+ exact alarms -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
    <!-- Android 13+ (não precisa de aprovação do utilizador para alarme apps) -->
    <uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
    <!-- Internet para push notifications -->
    <uses-permission android:name="android.permission.INTERNET"/>

# O ficheiro fica em:
# android/app/src/main/AndroidManifest.xml


# ── Backend — registar token FCM (Node.js / Express) ─────────────────────
# backend/routes/notifications.js

const express = require('express')
const router  = express.Router()
const admin   = require('firebase-admin')

// Inicializar Firebase Admin SDK (uma vez no app.js):
// admin.initializeApp({ credential: admin.credential.cert(serviceAccountKey) })

// Guardar tokens em memória / DB
const deviceTokens = new Set()

// POST /api/register-device
router.post('/register-device', (req, res) => {
  const { token, platform } = req.body
  if (!token) return res.status(400).json({ error: 'token required' })
  deviceTokens.add(token)
  console.log(`Device registered: ${platform} — ${token.slice(0,20)}...`)
  res.json({ ok: true })
})

// POST /api/send-reminder  (para testes ou cron job)
router.post('/send-reminder', async (req, res) => {
  const { title, body, token } = req.body
  const targets = token ? [token] : [...deviceTokens]
  if (targets.length === 0) return res.status(400).json({ error: 'no devices' })

  const results = await Promise.allSettled(
    targets.map(t =>
      admin.messaging().send({
        token: t,
        notification: { title, body },
        android: {
          priority: 'high',
          notification: {
            channelId: 'contas',
            color: '#6C5CE7',
            icon: 'ic_stat_icon_config_sample',
          },
        },
      })
    )
  )
  res.json({ sent: results.filter(r => r.status==='fulfilled').length })
})

module.exports = router


# ── Setup inicial no MacBook ──────────────────────────────────────────────
# 1. Instalar dependências
brew install node
brew install --cask android-studio   # para Android SDK
# ou só o command-line tools: https://developer.android.com/studio#command-tools

# 2. Variáveis de ambiente (~/.zshrc)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 3. Iniciar projeto
npm install
npx cap add android         # cria a pasta android/
npx cap sync android        # copia dist/ + plugins para android/

# 4. Adicionar google-services.json (para FCM)
# Descarrega de Firebase Console → Project Settings → Android app
# Coloca em: android/app/google-services.json

# 5. Build local (opcional, GitHub Actions faz isto automaticamente)
cd android && ./gradlew assembleDebug
# APK em: android/app/build/outputs/apk/debug/app-debug.apk
# Instalar no telemóvel via USB:
adb install android/app/build/outputs/apk/debug/app-debug.apk
