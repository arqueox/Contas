package com.arqueox.contasapp

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var etValor1: EditText
    private lateinit var etValor2: EditText
    private lateinit var tvResultado: TextView
    private lateinit var btnSomar: Button
    private lateinit var btnSubtrair: Button
    private lateinit var btnMultiplicar: Button
    private lateinit var btnDividir: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Inicializar views
        etValor1 = findViewById(R.id.etValor1)
        etValor2 = findViewById(R.id.etValor2)
        tvResultado = findViewById(R.id.tvResultado)
        btnSomar = findViewById(R.id.btnSomar)
        btnSubtrair = findViewById(R.id.btnSubtrair)
        btnMultiplicar = findViewById(R.id.btnMultiplicar)
        btnDividir = findViewById(R.id.btnDividir)

        // Configurar listeners dos botões
        btnSomar.setOnClickListener { calcular("+") }
        btnSubtrair.setOnClickListener { calcular("-") }
        btnMultiplicar.setOnClickListener { calcular("×") }
        btnDividir.setOnClickListener { calcular("÷") }
    }

    private fun calcular(operacao: String) {
        val valor1Str = etValor1.text.toString()
        val valor2Str = etValor2.text.toString()

        if (valor1Str.isEmpty() || valor2Str.isEmpty()) {
            tvResultado.text = "Por favor, insira ambos os valores"
            return
        }

        val valor1 = valor1Str.toDoubleOrNull()
        val valor2 = valor2Str.toDoubleOrNull()

        if (valor1 == null || valor2 == null) {
            tvResultado.text = "Valores inválidos"
            return
        }

        val resultado = when (operacao) {
            "+" -> valor1 + valor2
            "-" -> valor1 - valor2
            "×" -> valor1 * valor2
            "÷" -> {
                if (valor2 == 0.0) {
                    tvResultado.text = "Erro: Divisão por zero"
                    return
                }
                valor1 / valor2
            }
            else -> 0.0
        }

        // Formatar o resultado para remover decimais desnecessários
        val resultadoFormatado = if (resultado == resultado.toLong().toDouble()) {
            resultado.toLong().toString()
        } else {
            resultado.toString()
        }

        tvResultado.text = "Resultado: $resultadoFormatado"
    }
}
