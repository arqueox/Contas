package com.arqueox.contasapp

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class DespesaAdapter(
    private val despesas: MutableList<Despesa>,
    private val onPagamentoChanged: (Despesa, Boolean) -> Unit,
    private val onRemover: (Despesa) -> Unit
) : RecyclerView.Adapter<DespesaAdapter.DespesaViewHolder>() {

    class DespesaViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvNome: TextView = view.findViewById(R.id.tvNome)
        val tvValor: TextView = view.findViewById(R.id.tvValor)
        val tvVencimento: TextView = view.findViewById(R.id.tvVencimento)
        val tvCategoria: TextView = view.findViewById(R.id.tvCategoria)
        val cbPaga: CheckBox = view.findViewById(R.id.cbPaga)
        val btnRemover: ImageButton = view.findViewById(R.id.btnRemover)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DespesaViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_despesa, parent, false)
        return DespesaViewHolder(view)
    }

    override fun onBindViewHolder(holder: DespesaViewHolder, position: Int) {
        val despesa = despesas[position]

        holder.tvNome.text = despesa.nome
        holder.tvValor.text = "€${String.format("%.2f", despesa.valor)}"
        holder.tvVencimento.text = "Dia ${despesa.diaVencimento}"
        holder.tvCategoria.text = despesa.categoria
        holder.cbPaga.isChecked = despesa.paga

        // Estilo quando paga
        if (despesa.paga) {
            holder.itemView.alpha = 0.6f
        } else {
            holder.itemView.alpha = 1.0f
        }

        holder.cbPaga.setOnCheckedChangeListener { _, isChecked ->
            onPagamentoChanged(despesa, isChecked)
        }

        holder.btnRemover.setOnClickListener {
            onRemover(despesa)
        }
    }

    override fun getItemCount() = despesas.size
}
