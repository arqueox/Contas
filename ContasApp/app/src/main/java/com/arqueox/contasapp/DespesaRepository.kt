package com.arqueox.contasapp

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class DespesaRepository(context: Context) {

    private val sharedPreferences = context.getSharedPreferences("despesas_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    private val key = "despesas_list"

    fun guardarDespesas(despesas: List<Despesa>) {
        val json = gson.toJson(despesas)
        sharedPreferences.edit().putString(key, json).apply()
    }

    fun carregarDespesas(): MutableList<Despesa> {
        val json = sharedPreferences.getString(key, null)
        return if (json != null) {
            val type = object : TypeToken<MutableList<Despesa>>() {}.type
            gson.fromJson(json, type)
        } else {
            mutableListOf()
        }
    }

    fun adicionarDespesa(despesa: Despesa) {
        val despesas = carregarDespesas()
        despesas.add(despesa)
        guardarDespesas(despesas)
    }

    fun removerDespesa(id: String) {
        val despesas = carregarDespesas()
        despesas.removeAll { it.id == id }
        guardarDespesas(despesas)
    }

    fun marcarComoPaga(id: String, paga: Boolean) {
        val despesas = carregarDespesas()
        despesas.find { it.id == id }?.paga = paga
        guardarDespesas(despesas)
    }
}
