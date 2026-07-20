'use client';

import { useState, useTransition } from 'react';
import { addCategory, deleteCategory, updateCategory } from '@/app/categories/actions';
import { Trash2, Plus, Target, Edit2, X } from 'lucide-react';
import { BudgetPieChart } from '@/components/categories/BudgetPieChart';

interface CategoryProps {
  id: string;
  name: string;
  color: string;
  monthlyLimit: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function CategoryClient({ 
  categories, 
  budgetData,
  spentByCategory
}: { 
  categories: CategoryProps[], 
  budgetData: CategoryData[],
  spentByCategory: Record<string, number>
}) {
  const [isPending, startTransition] = useTransition();
  const [editingCategory, setEditingCategory] = useState<CategoryProps | null>(null);

  const handleAdd = (formData: FormData) => {
    startTransition(() => {
      addCategory(formData);
    });
  };

  const handleEdit = (formData: FormData) => {
    if (!editingCategory) return;
    startTransition(() => {
      updateCategory(editingCategory.id, formData).then(() => {
        setEditingCategory(null);
      });
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      startTransition(() => {
        deleteCategory(id);
      });
    }
  };

  // Calcular limites consolidados
  const categoriesWithLimits = categories.filter(c => parseFloat(c.monthlyLimit) > 0);
  const totalLimit = categoriesWithLimits.reduce((sum, cat) => sum + parseFloat(cat.monthlyLimit), 0);
  const totalSpentInLimitedCategories = categoriesWithLimits.reduce((sum, cat) => sum + (spentByCategory[cat.name] || 0), 0);
  const percentUsed = totalLimit > 0 ? (totalSpentInLimitedCategories / totalLimit) * 100 : 0;
  const isOverBudget = totalSpentInLimitedCategories > totalLimit;
  const maxBarValue = Math.max(totalSpentInLimitedCategories, totalLimit);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Target className="text-brand" />
            Minhas Categorias e Metas
          </h2>

          {/* Gráfico de Barra de Carregamento Consolidada das Metas */}
          {totalLimit > 0 && (
            <div className={`glass-panel p-6 rounded-2xl mb-6 border transition-all duration-300 ${isOverBudget ? 'border-rose-500/30' : 'border-neutral-800'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Progresso Geral das Metas</h3>
                  <p className="text-[10px] text-slate-500">Consumo consolidado das categorias com limite no mês</p>
                </div>
                <div className="flex items-baseline gap-1.5 sm:text-right">
                  <span className="text-lg font-bold text-white">
                    {`R$ ${totalSpentInLimitedCategories.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {`R$ ${totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ml-2 ${isOverBudget ? 'bg-rose-500/10 text-rose-455 text-rose-400' : 'bg-brand/10 text-brand'}`}>
                    {percentUsed.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800/40 relative">
                {categoriesWithLimits.map((cat) => {
                  const spent = spentByCategory[cat.name] || 0;
                  if (spent === 0) return null;
                  const segmentWidth = (spent / maxBarValue) * 100;
                  
                  return (
                    <div
                      key={cat.id}
                      style={{ 
                        width: `${segmentWidth}%`, 
                        backgroundColor: cat.color 
                      }}
                      className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-80 cursor-pointer"
                      title={`${cat.name}: R$ ${spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                  );
                })}
              </div>

              {/* Sub-legend for categories inside the bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                {categoriesWithLimits.map((cat) => {
                  const spent = spentByCategory[cat.name] || 0;
                  const percentOfCategoryLimit = parseFloat(cat.monthlyLimit) > 0 ? (spent / parseFloat(cat.monthlyLimit)) * 100 : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="font-medium text-slate-300">{cat.name}:</span>
                      <span>
                        {`R$ ${spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} ({percentOfCategoryLimit.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {categories.length === 0 ? (
            <p className="text-slate-500">Nenhuma categoria cadastrada. Crie uma ao lado!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="glass-panel p-4 rounded-xl flex flex-col gap-3 group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: cat.color }}></div>
                  
                  <div className="flex items-center justify-between pl-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                      <span className="font-semibold">{cat.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                      <button 
                        onClick={() => setEditingCategory(cat)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-brand transition-colors rounded-lg disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        disabled={isPending}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded-lg disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pl-3 mt-1">
                    <p className="text-xs text-slate-400 mb-1">Limite Mensal</p>
                    <p className="text-sm font-medium">
                      {parseFloat(cat.monthlyLimit) > 0 
                        ? `R$ ${parseFloat(cat.monthlyLimit).toFixed(2).replace('.', ',')}` 
                        : 'Sem limite'
                      }
                    </p>
                  </div>

                  {/* Barra de Progresso Individual da Categoria */}
                  {parseFloat(cat.monthlyLimit) > 0 && (() => {
                    const spent = spentByCategory[cat.name] || 0;
                    const limit = parseFloat(cat.monthlyLimit);
                    const percentage = Math.min((spent / limit) * 100, 100);
                    const overLimit = spent > limit;
                    
                    return (
                      <div className="pl-3 mt-2 pt-2 border-t border-neutral-900/60">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                          <span>Consumido</span>
                          <span className={overLimit ? 'text-rose-455 text-rose-400 font-semibold' : 'text-slate-300'}>
                            {`R$ ${spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(spent / limit * 100).toFixed(0)}%)`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                          <div 
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: overLimit ? '#f43f5e' : cat.color 
                            }} 
                            className="h-full rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <div className="glass-panel p-6 rounded-2xl h-max">
            <h3 className="text-lg font-bold mb-4">Adicionar Nova</h3>
          
          <form action={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nome da Categoria</label>
              <input 
                type="text" 
                name="name" 
                required
                placeholder="Ex: Farmácia"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-1">Cor</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  name="color" 
                  defaultValue="#3b82f6"
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-xs text-slate-500">Escolha uma cor para os gráficos</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Limite Mensal (R$)</label>
              <input 
                type="number" 
                name="monthlyLimit" 
                step="0.01"
                placeholder="0,00 (Opcional)"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
              />
            </div>

            <button 
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-brand/20 text-brand hover:bg-brand/30 hover:text-white border border-brand/50 font-medium py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus size={16} />
              {isPending ? 'Salvando...' : 'Criar Categoria'}
            </button>
          </form>
          </div>

          {budgetData && budgetData.length > 0 && (
            <div className="animate-in fade-in zoom-in duration-500">
              <BudgetPieChart data={budgetData} />
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setEditingCategory(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold mb-6">Editar Categoria</h2>

            <form action={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome da Categoria</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  defaultValue={editingCategory.name}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    name="color" 
                    defaultValue={editingCategory.color}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-xs text-slate-500">Escolha uma cor para os gráficos</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Limite Mensal (R$)</label>
                <input 
                  type="number" 
                  name="monthlyLimit" 
                  step="0.01"
                  defaultValue={parseFloat(editingCategory.monthlyLimit) > 0 ? editingCategory.monthlyLimit : ''}
                  placeholder="0,00 (Opcional)"
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none transition-colors"
                />
              </div>

              <button 
                type="submit"
                disabled={isPending}
                className="w-full mt-4 bg-brand hover:bg-brand-light text-black font-semibold py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
