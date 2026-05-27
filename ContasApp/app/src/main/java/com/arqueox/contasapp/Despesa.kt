package com.arqueox.contasapp

import java.io.Serializable
import java.util.UUID

data class Despesa(
    val id: String = UUID.randomUUID().toString(),
    val nome: String,
    val valor: Double,
    val diaVencimento: Int,
    val categoria: String,
    var paga: Boolean = false
) : Serializable
