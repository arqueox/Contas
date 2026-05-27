package com.arqueox.contasapp

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import java.util.Calendar

class MainActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: DespesaAdapter
    private lateinit var repository: DespesaRepository
    private lateinit var tvTotal: TextView
    private lateinit var tvTotalPago: TextView
    private lateinit var tvTotalPendente: TextView

    private val categorias = arrayOf(
        "Habitação", "Alimentação", "Transportes", "Saúde",
        "Educação", "Lazer", "Serviços", "Outros"
    )

    companion object {
        private const val NOTIFICATION_PERMISSION_CODE = 123
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        repository = DespesaRepository(this)

        // Inicializar views
        recyclerView = findViewById(R.id.rvDespesas)
        tvTotal = findViewById(R.id.tvTotal)
        tvTotalPago = findViewById(R.id.tvTotalPago)
        tvTotalPendente = findViewById(R.id.tvTotalPendente)
        val fabAdicionar: FloatingActionButton = findViewById(R.id.fabAdicionar)

        // Configurar RecyclerView
        recyclerView.layoutManager = LinearLayoutManager(this)
        carregarDespesas()

        // Botão adicionar
        fabAdicionar.setOnClickListener {
            mostrarDialogAdicionar()
        }

        // Pedir permissão para notificações (Android 13+)
        pedirPermissaoNotificacoes()

        // Agendar notificação diária
        agendarNotificacaoDiaria()
    }

    override fun onResume() {
        super.onResume()
        carregarDespesas()
    }

    private fun carregarDespesas() {
        val despesas = repository.carregarDespesas().sortedBy { it.diaVencimento }.toMutableList()

        adapter = DespesaAdapter(
            despesas,
            onPagamentoChanged = { despesa, paga ->
                repository.marcarComoPaga(despesa.id, paga)
                atualizarResumo()
            },
            onRemover = { despesa ->
                AlertDialog.Builder(this)
                    .setTitle("Remover Despesa")
                    .setMessage("Tens a certeza que queres remover '${despesa.nome}'?")
                    .setPositiveButton("Remover") { _, _ ->
                        repository.removerDespesa(despesa.id)
                        carregarDespesas()
                        Toast.makeText(this, "Despesa removida", Toast.LENGTH_SHORT).show()
                    }
                    .setNegativeButton("Cancelar", null)
                    .show()
            }
        )
        recyclerView.adapter = adapter
        atualizarResumo()
    }

    private fun atualizarResumo() {
        val despesas = repository.carregarDespesas()
        val total = despesas.sumOf { it.valor }
        val totalPago = despesas.filter { it.paga }.sumOf { it.valor }
        val totalPendente = total - totalPago

        tvTotal.text = "Total: €${String.format("%.2f", total)}"
        tvTotalPago.text = "Pago: €${String.format("%.2f", totalPago)}"
        tvTotalPendente.text = "Pendente: €${String.format("%.2f", totalPendente)}"
    }

    private fun mostrarDialogAdicionar() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_adicionar_despesa, null)

        val etNome = dialogView.findViewById<EditText>(R.id.etNome)
        val etValor = dialogView.findViewById<EditText>(R.id.etValor)
        val etDia = dialogView.findViewById<EditText>(R.id.etDia)
        val spinnerCategoria = dialogView.findViewById<Spinner>(R.id.spinnerCategoria)

        // Configurar spinner de categorias
        val spinnerAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, categorias)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerCategoria.adapter = spinnerAdapter

        AlertDialog.Builder(this)
            .setTitle("Nova Despesa Recorrente")
            .setView(dialogView)
            .setPositiveButton("Adicionar") { _, _ ->
                val nome = etNome.text.toString().trim()
                val valorStr = etValor.text.toString().trim()
                val diaStr = etDia.text.toString().trim()

                if (nome.isEmpty() || valorStr.isEmpty() || diaStr.isEmpty()) {
                    Toast.makeText(this, "Preenche todos os campos", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                val valor = valorStr.toDoubleOrNull()
                val dia = diaStr.toIntOrNull()

                if (valor == null || valor <= 0) {
                    Toast.makeText(this, "Valor inválido", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                if (dia == null || dia < 1 || dia > 31) {
                    Toast.makeText(this, "Dia inválido (1-31)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                val categoria = spinnerCategoria.selectedItem.toString()

                val despesa = Despesa(
                    nome = nome,
                    valor = valor,
                    diaVencimento = dia,
                    categoria = categoria
                )

                repository.adicionarDespesa(despesa)
                carregarDespesas()
                Toast.makeText(this, "Despesa adicionada!", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun pedirPermissaoNotificacoes() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_CODE
                )
            }
        }
    }

    private fun agendarNotificacaoDiaria() {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, DespesaNotificationReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Agendar para todos os dias às 9h da manhã
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 9)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            if (before(Calendar.getInstance())) {
                add(Calendar.DAY_OF_MONTH, 1)
            }
        }

        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pendingIntent
        )
    }
}
