// api/state.js
import { createClient } from '@supabase/supabase-js';

// As credenciais serão fornecidas de forma segura pelo Vercel (Variáveis de Ambiente)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  
  // Trata a requisição GET (CARREGAR ESTADO)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('caixa_state')
      .select('data_json')
      .eq('id', 1) // Busca o único registro que armazena o estado completo (ID fixo 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar estado:', error);
      return res.status(500).json({ error: 'Erro interno ao carregar' });
    }
    
    // Retorna o JSON do banco, ou um objeto vazio se não houver dados (primeira execução)
    return res.status(200).json(data ? data.data_json : {});

  // Trata a requisição POST (SALVAR ESTADO)
  } else if (req.method === 'POST') {
    const state = req.body;
    
    // Usa upsert: insere o estado se for a primeira vez (id=1) ou atualiza se já existir
    const { error } = await supabase
      .from('caixa_state')
      .upsert({ id: 1, data_json: state }, { onConflict: 'id' });

    if (error) {
      console.error('Erro ao salvar estado:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar' });
    }

    return res.status(200).json({ message: 'Estado salvo com sucesso' });
    
  } else {
    // Método não permitido
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
// ...
/* STATE persistence - AGORA ACESSANDO A API DO VERCEL */
async function loadState() {
    try {
        const response = await fetch('/api/state'); // Requisição GET
        if (!response.ok) throw new Error('Falha ao carregar estado do servidor');

        const state = await response.json();
        
        // Aplica o estado carregado do servidor
        carrinho = state.carrinho ? state.carrinho : [];
        historicoTurno = state.historicoTurno ? state.historicoTurno : [];
        saquesTurno = state.saquesTurno ? state.saquesTurno : [];
        historicoCompleto = state.historicoCompleto ? state.historicoCompleto : [];
        // Converte para Int, pois o JSON pode retornar como string
        turnoStartTime = state.turnoStartTime ? parseInt(state.turnoStartTime) : null; 
        
        // Se o turno estiver ativo, reinicia o contador
        if (turnoStartTime) {
            startWorkTimeCounter();
        }

    } catch (error) {
        console.error('Erro ao carregar estado do servidor. Usando estado inicial.', error);
        // Opcional: Aqui você pode adicionar um código para notificar o usuário.
    }
}

async function saveState() {
    // Reúne todas as variáveis de estado em um único objeto para envio
    const state = {
        carrinho,
        historicoTurno,
        saquesTurno,
        historicoCompleto,
        // Garante que o timestamp é salvo corretamente
        turnoStartTime: turnoStartTime 
    };
    
    // Remove a lógica de localStorage.setItem(...) antiga

    try {
        await fetch('/api/state', { // Requisição POST
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        // showNotification('Estado salvo na nuvem.', 'info'); // Opcional
    } catch (error) {
        console.error('Erro ao salvar estado na nuvem:', error);
        // showNotification('Erro ao salvar estado.', 'error'); // Opcional
    }
}
// ...