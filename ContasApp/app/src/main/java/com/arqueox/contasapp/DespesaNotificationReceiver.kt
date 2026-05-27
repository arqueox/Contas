package com.arqueox.contasapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import java.util.Calendar

class DespesaNotificationReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "despesas_channel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onReceive(context: Context, intent: Intent) {
        criarCanalNotificacao(context)
        verificarENotificar(context)
    }

    private fun criarCanalNotificacao(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nome = "Despesas Recorrentes"
            val descricao = "Notificações de despesas próximas do vencimento"
            val importancia = NotificationManager.IMPORTANCE_HIGH
            val canal = NotificationChannel(CHANNEL_ID, nome, importancia).apply {
                description = descricao
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(canal)
        }
    }

    private fun verificarENotificar(context: Context) {
        val repository = DespesaRepository(context)
        val despesas = repository.carregarDespesas()
        val hoje = Calendar.getInstance().get(Calendar.DAY_OF_MONTH)

        val despesasProximas = despesas.filter { despesa ->
            !despesa.paga && (despesa.diaVencimento - hoje in 0..3)
        }

        if (despesasProximas.isNotEmpty()) {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val total = despesasProximas.sumOf { it.valor }
            val nomes = despesasProximas.joinToString(", ") { it.nome }

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Despesas a vencer!")
                .setContentText("${despesasProximas.size} despesa(s): $nomes - Total: €${String.format("%.2f", total)}")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("Tens ${despesasProximas.size} despesa(s) a vencer nos próximos dias:\n\n$nomes\n\nTotal: €${String.format("%.2f", total)}"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        }
    }
}
