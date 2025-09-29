// Sistema de Ranking de Poker
class PokerRanking {
    constructor() {
        // Configuração do Supabase
        this.supabaseUrl = 'https://ijnjllnszmsgbnpxrtaa.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqbmpsbG5zem1zZ2JucHhydGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyMjE4NzQsImV4cCI6MjA0Mjc5Nzg3NH0.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E'; // Chave anônima pública
        this.supabase = null;
        this.useLocalStorage = true; // Fallback para localStorage
        
        // Dados locais
        this.players = {};
        this.history = [];
        this.weeklyWinners = [];
        this.currentWeek = this.getCurrentWeekNumber();
        
        // Cache busting - força recarregamento dos dados
        this.cacheVersion = Date.now();
        
        this.initSupabase();
        this.init();
    }

    // Inicializar Supabase
    async initSupabase() {
        try {
            // Chave anônima do projeto Supabase
            const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqbmpsbG5zem1zZ2JucHhydGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDY4NzMsImV4cCI6MjA3NDY4Mjg3M30.t5SpbO1oxji59pkgiDhGzT3WAAYLnmhmAkKzz9bUzAI';
            
            this.supabase = supabase.createClient(this.supabaseUrl, anonKey);
            
            // Testar conexão
            const { data, error } = await this.supabase.from('players').select('count', { count: 'exact', head: true });
            
            if (error) {
                console.warn('Erro ao conectar com Supabase, usando localStorage:', error);
                this.useLocalStorage = true;
            } else {
                console.log('Supabase conectado com sucesso');
                this.useLocalStorage = false;
                await this.createTablesIfNotExist();
            }
        } catch (error) {
            console.warn('Erro ao inicializar Supabase, usando localStorage:', error);
            this.useLocalStorage = true;
        }
    }

    // Criar tabelas se não existirem (fallback)
    async createTablesIfNotExist() {
        try {
            // Verificar se as tabelas existem tentando fazer uma consulta simples
            await this.supabase.from('players').select('count', { count: 'exact', head: true });
            await this.supabase.from('game_history').select('count', { count: 'exact', head: true });
            await this.supabase.from('weekly_winners').select('count', { count: 'exact', head: true });
            console.log('Tabelas do banco de dados verificadas');
        } catch (error) {
            console.warn('Algumas tabelas podem não existir. Execute o arquivo database-setup.sql no Supabase:', error);
        }
    }

    // Função para calcular o número da semana atual
    getCurrentWeekNumber() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const pastDaysOfYear = (now - startOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    }

    // Função para verificar se é uma nova semana
    isNewWeek() {
        const currentWeek = this.getCurrentWeekNumber();
        return currentWeek !== this.currentWeek;
    }

    // Carregar dados do localStorage ou Supabase
    async loadData() {
        if (this.useLocalStorage) {
            return this.loadLocalData();
        } else {
            return await this.loadSupabaseData();
        }
    }

    // Salvar dados no localStorage ou Supabase
    async saveData() {
        if (this.useLocalStorage) {
            this.saveLocalData();
        } else {
            await this.saveSupabaseData();
        }
    }

    // Carregar dados do localStorage
    loadLocalData() {
        try {
            const players = localStorage.getItem('pokerRanking_players');
            const history = localStorage.getItem('pokerRanking_history');
            const weeklyWinners = localStorage.getItem('pokerRanking_weeklyWinners');
            const currentWeek = localStorage.getItem('pokerRanking_currentWeek');
            
            return {
                players: players ? JSON.parse(players) : {},
                history: history ? JSON.parse(history) : [],
                weeklyWinners: weeklyWinners ? JSON.parse(weeklyWinners) : [],
                currentWeek: currentWeek ? parseInt(currentWeek) : this.getCurrentWeekNumber()
            };
        } catch (error) {
            console.error('Erro ao carregar dados locais:', error);
            return {
                players: {},
                history: [],
                weeklyWinners: [],
                currentWeek: this.getCurrentWeekNumber()
            };
        }
    }

    // Salvar dados no localStorage
    saveLocalData() {
        try {
            localStorage.setItem('pokerRanking_players', JSON.stringify(this.players));
            localStorage.setItem('pokerRanking_history', JSON.stringify(this.history));
            localStorage.setItem('pokerRanking_weeklyWinners', JSON.stringify(this.weeklyWinners));
            localStorage.setItem('pokerRanking_currentWeek', this.currentWeek.toString());
        } catch (error) {
            console.error('Erro ao salvar dados locais:', error);
        }
    }

    // Carregar dados do Supabase
    async loadSupabaseData() {
        try {
            // Adicionar timestamp para evitar cache
            const timestamp = Date.now();
            
            // Carregar jogadores
            const { data: playersData, error: playersError } = await this.supabase
                .from('players')
                .select('*')
                .order('name', { ascending: true });

            if (playersError) throw playersError;

            // Converter array para objeto com validação de tipos
            const players = {};
            playersData.forEach(player => {
                players[player.name] = {
                    points: parseInt(player.points) || 0,
                    gamesPlayed: parseInt(player.games_played) || 0,
                    wins: parseInt(player.wins) || 0,
                    positions: [], // Inicializar array de posições
                    totalPoints: parseInt(player.points) || 0
                };
            });

            // Carregar histórico
            const { data: historyData, error: historyError } = await this.supabase
                .from('game_history')
                .select('*')
                .order('game_date', { ascending: false });

            if (historyError) throw historyError;

            const history = historyData.map(game => ({
                playerName: String(game.player_name),
                position: parseInt(game.position),
                points: parseInt(game.points),
                date: new Date(game.game_date).toISOString(),
                totalPlayers: parseInt(game.total_players) || 6 // Carregar total_players
            }));

            // Reconstruir array de posições para cada jogador baseado no histórico
            history.forEach(game => {
                if (players[game.playerName]) {
                    players[game.playerName].positions.push(game.position);
                }
            });

            // Carregar ganhadores semanais
            const { data: winnersData, error: winnersError } = await this.supabase
                .from('weekly_winners')
                .select('*')
                .order('week_number', { ascending: false });

            if (winnersError) throw winnersError;

            const weeklyWinners = winnersData.map(winner => ({
                week: parseInt(winner.week_number),
                year: parseInt(winner.year),
                winners: [{ 
                    name: String(winner.winner_name), 
                    points: parseInt(winner.points) 
                }]
            }));

            // Forçar atualização da interface após carregar dados
            setTimeout(() => {
                this.updateDisplay();
            }, 100);

            return {
                players,
                history,
                weeklyWinners,
                currentWeek: this.getCurrentWeekNumber()
            };

        } catch (error) {
            console.error('Erro ao carregar dados do Supabase:', error);
            // Fallback para localStorage
            return this.loadLocalData();
        }
    }

    // Salvar dados no Supabase
    async saveSupabaseData() {
        try {
            // Salvar jogadores com validação de tipos
            const playersArray = Object.entries(this.players).map(([name, data]) => ({
                name: String(name),
                points: parseInt(data.totalPoints) || 0,
                games_played: parseInt(data.gamesPlayed) || 0,
                wins: parseInt(data.wins) || 0
            }));

            // Upsert jogadores (inserir ou atualizar)
            for (const player of playersArray) {
                const { error } = await this.supabase
                    .from('players')
                    .upsert(player, { onConflict: 'name' });
                
                if (error) {
                    console.error('Erro ao salvar jogador:', player, error);
                    throw error;
                }
            }

            // Salvar histórico (apenas novos registros) com validação
            const existingHistory = await this.supabase
                .from('game_history')
                .select('player_name, game_date, position');

            const existingHistorySet = new Set(
                existingHistory.data?.map(h => `${h.player_name}-${h.game_date}-${h.position}`) || []
            );

            const newHistoryEntries = this.history.filter(entry => {
                const key = `${entry.playerName}-${entry.date}-${entry.position}`;
                return !existingHistorySet.has(key);
            });

            if (newHistoryEntries.length > 0) {
                const historyArray = newHistoryEntries.map(entry => ({
                    player_name: String(entry.playerName),
                    position: parseInt(entry.position),
                    points: parseInt(entry.points),
                    game_date: entry.date,
                    total_players: parseInt(entry.totalPlayers) || 6 // Adicionar campo total_players
                }));

                const { error } = await this.supabase
                    .from('game_history')
                    .insert(historyArray);
                
                if (error) {
                    console.error('Erro ao salvar histórico:', historyArray, error);
                    throw error;
                }
            }

            console.log('Dados salvos no Supabase com sucesso');

        } catch (error) {
            console.error('Erro ao salvar dados no Supabase:', error);
            // Fallback para localStorage
            this.saveLocalData();
        }
    }

    // Sistema de pontuação baseado na posição final
    calculatePoints(position, totalPlayers) {
        // Converter para números inteiros para garantir comparação correta
        const pos = parseInt(position);
        const total = parseInt(totalPlayers);
        
        console.log('calculatePoints - entrada:', { position: pos, totalPlayers: total });
        
        const pointsTable = {
            2: { 1: 10, 2: 5 },
            3: { 1: 15, 2: 8, 3: 3 },
            4: { 1: 20, 2: 12, 3: 6, 4: 2 },
            5: { 1: 25, 2: 15, 3: 8, 4: 4, 5: 1 },
            6: { 1: 30, 2: 18, 3: 10, 4: 5, 5: 2, 6: 1 },
            7: { 1: 35, 2: 21, 3: 12, 4: 7, 5: 3, 6: 2, 7: 1 },
            8: { 1: 40, 2: 24, 3: 14, 4: 8, 5: 4, 6: 2, 7: 1, 8: 1 }
        };
        
        const points = pointsTable[total]?.[pos] || 0;
        console.log('calculatePoints - resultado:', points);
        
        return points;
    }

    // Adicionar resultado de partida
    async addGameResult(playerName, position, totalPlayers) {
        if (!playerName || !position || !totalPlayers) {
            this.showNotification('Por favor, preencha todos os campos!', 'error');
            return false;
        }

        // Converter para números e validar
        const positionNum = parseInt(position);
        const totalPlayersNum = parseInt(totalPlayers);
        
        if (isNaN(positionNum) || isNaN(totalPlayersNum) || positionNum < 1 || positionNum > totalPlayersNum) {
            this.showNotification('Posição ou total de jogadores inválido', 'error');
            return false;
        }

        // Verificar se é uma nova semana e processar reset se necessário
        if (this.isNewWeek()) {
            await this.processWeeklyReset();
        }

        // Calcular pontos
        const points = this.calculatePoints(positionNum, totalPlayersNum);
        
        console.log('addGameResult - playerName:', playerName, 'position:', positionNum, 'totalPlayers:', totalPlayersNum, 'points:', points);
        
        const gameDate = new Date();

        // Atualizar dados locais
        if (!this.players[playerName]) {
            this.players[playerName] = {
                name: playerName,
                totalPoints: 0,
                gamesPlayed: 0,
                wins: 0,
                positions: []
            };
        }

        this.players[playerName].totalPoints += points;
        this.players[playerName].gamesPlayed += 1;
        this.players[playerName].positions.push(positionNum);
        
        if (positionNum === 1) {
            this.players[playerName].wins += 1;
        }

        // Adicionar ao histórico local com todos os campos necessários
        const gameEntry = {
            id: Date.now(),
            playerName: String(playerName),
            position: positionNum,
            totalPlayers: totalPlayersNum,
            points: points,
            date: gameDate.toISOString(),
            week: this.currentWeek
        };
        
        this.history.unshift(gameEntry);

        // Salvar dados
        await this.saveData();

        // Atualizar display
        this.updateDisplay();
        this.clearForm();
        
        this.showNotification(`Resultado salvo! ${playerName} ganhou ${points} pontos.`, 'success');
        return true;
    }

    // Inicialização da aplicação
    async init() {
        this.initializeEventListeners();
        
        // Limpar cache do localStorage se necessário
        this.clearBrowserCache();
        
        // Carregar dados
        const data = await this.loadData();
        this.players = data.players;
        this.history = data.history;
        this.weeklyWinners = data.weeklyWinners;
        this.currentWeek = data.currentWeek;
        
        // Atualizar display
        this.updateDisplay();
        
        // Configurar atualização periódica para sincronização
        this.setupPeriodicSync();
    }

    // Limpar cache do navegador
    clearBrowserCache() {
        try {
            // Verificar se há uma versão anterior em cache
            const cachedVersion = localStorage.getItem('pokerRanking_version');
            const currentVersion = this.cacheVersion.toString();
            
            if (cachedVersion !== currentVersion) {
                // Limpar dados antigos do localStorage
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('pokerRanking_')) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
                localStorage.setItem('pokerRanking_version', currentVersion);
                
                console.log('Cache limpo devido à nova versão');
            }
        } catch (error) {
            console.warn('Erro ao limpar cache:', error);
        }
    }

    // Método para forçar reload dos dados do Supabase
    async forceReloadFromSupabase() {
        try {
            this.showNotification('Recarregando dados do Supabase...', 'info');
            
            // Forçar reconexão com Supabase
            await this.initSupabase();
            
            if (!this.useLocalStorage && this.supabase) {
                // Carregar dados diretamente do Supabase
                const data = await this.loadSupabaseData();
                
                // Atualizar dados locais
                this.players = data.players;
                this.history = data.history;
                this.weeklyWinners = data.weeklyWinners;
                this.currentWeek = data.currentWeek;
                
                // Atualizar interface
                this.updateDisplay();
                
                const playersCount = Object.keys(this.players).length;
                const historyCount = this.history.length;
                
                this.showNotification(`Dados recarregados! ${playersCount} jogadores, ${historyCount} partidas`, 'success');
                
                console.log('Dados recarregados do Supabase:', {
                    players: this.players,
                    history: this.history,
                    weeklyWinners: this.weeklyWinners
                });
                
                return true;
            } else {
                this.showNotification('Não foi possível conectar ao Supabase. Usando dados locais.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro ao recarregar dados do Supabase:', error);
            this.showNotification('Erro ao recarregar dados: ' + error.message, 'error');
            return false;
        }
    }

    // Método para sincronizar dados manualmente
    async manualSync() {
        try {
            this.showNotification('Sincronizando dados...', 'info');
            
            // Primeiro, salvar dados locais no Supabase (se houver)
            if (!this.useLocalStorage) {
                await this.saveSupabaseData();
            }
            
            // Depois, recarregar dados do Supabase
            const success = await this.forceReloadFromSupabase();
            
            if (success) {
                this.showNotification('Sincronização concluída com sucesso!', 'success');
            }
            
            return success;
        } catch (error) {
            console.error('Erro na sincronização manual:', error);
            this.showNotification('Erro na sincronização: ' + error.message, 'error');
            return false;
        }
    }

    // Método para verificar status da conexão
    async checkSupabaseConnection() {
        try {
            if (!this.supabase) {
                return { connected: false, message: 'Cliente Supabase não inicializado' };
            }
            
            const { data, error } = await this.supabase
                .from('players')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                return { connected: false, message: error.message };
            }
            
            return { connected: true, message: 'Conexão ativa', count: data };
        } catch (error) {
            return { connected: false, message: error.message };
        }
    }
    setupPeriodicSync() {
        // Sincronizar dados a cada 30 segundos se não estiver usando localStorage
        if (!this.useLocalStorage) {
            setInterval(async () => {
                try {
                    const data = await this.loadSupabaseData();
                    
                    // Verificar se houve mudanças
                    const currentPlayersCount = Object.keys(this.players).length;
                    const newPlayersCount = Object.keys(data.players).length;
                    const currentHistoryCount = this.history.length;
                    const newHistoryCount = data.history.length;
                    
                    if (newPlayersCount !== currentPlayersCount || newHistoryCount !== currentHistoryCount) {
                        this.players = data.players;
                        this.history = data.history;
                        this.weeklyWinners = data.weeklyWinners;
                        this.updateDisplay();
                        console.log('Dados sincronizados automaticamente');
                    }
                } catch (error) {
                    console.warn('Erro na sincronização automática:', error);
                }
            }, 30000); // 30 segundos
         }
         
         const source = this.useLocalStorage ? 'dados locais' : 'Supabase';
         this.showNotification(`Sistema carregado com ${source}`, 'success');
    }

    // Obter ranking ordenado
    getRanking() {
        return Object.entries(this.players)
            .map(([name, player]) => ({
                name: name,
                ...player
            }))
            .sort((a, b) => {
                // Primeiro critério: pontos totais
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                // Segundo critério: número de vitórias
                if (b.wins !== a.wins) {
                    return b.wins - a.wins;
                }
                // Terceiro critério: média de posição (menor é melhor)
                const positionsA = a.positions || [];
                const positionsB = b.positions || [];
                const avgA = positionsA.length > 0 ? 
                    positionsA.reduce((sum, pos) => sum + pos, 0) / positionsA.length : 0;
                const avgB = positionsB.length > 0 ? 
                    positionsB.reduce((sum, pos) => sum + pos, 0) / positionsB.length : 0;
                return avgA - avgB;
            });
    }

    // Atualizar display do ranking
    updateRankingDisplay() {
        const tbody = document.getElementById('rankingTableBody');
        const ranking = this.getRanking();

        if (ranking.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>Nenhum jogador cadastrado ainda</p>
                        <small>Adicione o primeiro resultado para começar o ranking!</small>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = ranking.map((player, index) => {
            const position = index + 1;
            // Verificar se player.positions existe e é um array antes de usar reduce
            const positions = player.positions || [];
            const average = positions.length > 0 ? 
                positions.reduce((sum, pos) => sum + pos, 0) / positions.length : 0;
            const positionClass = position <= 3 ? `position-${position}` : 'position-other';
            
            return `
                <tr>
                    <td>
                        <span class="position-badge ${positionClass}">${position}</span>
                    </td>
                    <td><strong>${player.name}</strong></td>
                    <td><strong>${player.totalPoints}</strong></td>
                    <td>${player.gamesPlayed}</td>
                    <td>${player.wins}</td>
                    <td>${average.toFixed(1)}</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-edit" onclick="pokerRanking.editPlayer('${player.name}')" title="Editar nome">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="pokerRanking.confirmDeletePlayer('${player.name}')" title="Excluir jogador">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Atualizar display do histórico
    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>Nenhuma partida registrada ainda</p>
                    <small>O histórico das partidas aparecerá aqui</small>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.history.slice(0, 20).map(game => {
            const date = new Date(game.date);
            const formattedDate = date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const positionText = this.getPositionText(game.position);
            const pointsText = game.points > 0 ? `+${game.points} pontos` : 'Sem pontos';
            
            return `
                <div class="history-item">
                    <div class="history-header">
                        <span><strong>${game.playerName}</strong> - ${positionText}</span>
                        <span class="history-date">${formattedDate}</span>
                    </div>
                    <div class="history-details">
                        ${pointsText} • ${game.totalPlayers} jogadores na mesa
                    </div>
                </div>
            `;
        }).join('');
    }

    // Obter texto da posição
    getPositionText(position) {
        const positions = {
            1: '🥇 1º Lugar',
            2: '🥈 2º Lugar', 
            3: '🥉 3º Lugar',
            4: '4º Lugar',
            5: '5º Lugar',
            6: '6º Lugar',
            7: '7º Lugar',
            8: '8º Lugar'
        };
        return positions[position] || `${position}º Lugar`;
    }

    // Atualizar todo o display
    updateDisplay() {
        this.updateRankingDisplay();
        this.updateHistoryDisplay();
        this.updateWeeklyWinnersDisplay();
    }

    // Limpar formulário
    clearForm() {
        document.getElementById('playerName').value = '';
        document.getElementById('position').value = '';
        document.getElementById('totalPlayers').value = '6';
    }

    // Limpar todos os dados
    async clearAllData() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita e afetará todos os usuários!')) {
            try {
                this.showNotification('Limpando dados...', 'info');
                
                // Limpar dados locais
                this.players = {};
                this.history = [];
                
                // Salvar dados limpos
                await this.saveData();
                
                this.updateDisplay();
                this.showNotification('Todos os dados foram limpos com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao limpar dados:', error);
                this.showNotification('Erro ao limpar dados', 'error');
            }
        }
    }

    // Função para excluir um jogador específico
    async deletePlayer(playerName) {
        if (confirm(`Tem certeza que deseja excluir ${playerName}? Esta ação não pode ser desfeita!`)) {
            try {
                // Remover do Supabase primeiro
                if (this.supabase) {
                    // Deletar histórico do jogador
                    const { error: historyError } = await this.supabase
                        .from('game_history')
                        .delete()
                        .eq('player_name', playerName);
                    
                    if (historyError) throw historyError;
                    
                    // Deletar jogador
                    const { error: playerError } = await this.supabase
                        .from('players')
                        .delete()
                        .eq('name', playerName);
                    
                    if (playerError) throw playerError;
                }
                
                // Remover dos dados locais
                delete this.players[playerName];
                this.history = this.history.filter(h => h.playerName !== playerName);
                
                this.updateDisplay();
                this.showNotification(`${playerName} foi excluído com sucesso!`, 'success');
            } catch (error) {
                console.error('Erro ao excluir jogador:', error);
                this.showNotification('Erro ao excluir jogador', 'error');
                
                // Remover apenas localmente se falhar online
                delete this.players[playerName];
                this.history = this.history.filter(h => h.playerName !== playerName);
                this.updateDisplay();
            }
        }
    }

    // Função para editar nome de um jogador
    editPlayer(playerName) {
        const newName = prompt(`Digite o novo nome para "${playerName}":`, playerName);
        
        if (newName && newName.trim() !== '' && newName !== playerName) {
            const trimmedName = newName.trim();
            
            // Verificar se o novo nome já existe
            if (this.players[trimmedName]) {
                this.showNotification('Já existe um jogador com este nome!', 'error');
                return;
            }
            
            this.editPlayerName(playerName, trimmedName);
        }
    }

    // Função auxiliar para editar nome do jogador (implementação que estava faltando)
    async editPlayerName(oldName, newName) {
        try {
            // Atualizar no Supabase primeiro
            if (this.supabase) {
                // Atualizar histórico do jogador
                const { error: historyError } = await this.supabase
                    .from('game_history')
                    .update({ player_name: newName })
                    .eq('player_name', oldName);
                
                if (historyError) throw historyError;
                
                // Atualizar jogador
                const { error: playerError } = await this.supabase
                    .from('players')
                    .update({ name: newName })
                    .eq('name', oldName);
                
                if (playerError) throw playerError;
            }
            
            // Atualizar dados locais
            if (this.players[oldName]) {
                this.players[newName] = { ...this.players[oldName] };
                this.players[newName].name = newName;
                delete this.players[oldName];
            }
            
            // Atualizar histórico local
            this.history.forEach(h => {
                if (h.playerName === oldName) {
                    h.playerName = newName;
                }
            });
            
            this.updateDisplay();
            this.showNotification(`Nome alterado de ${oldName} para ${newName}`, 'success');
        } catch (error) {
            console.error('Erro ao editar nome do jogador:', error);
            this.showNotification('Erro ao editar nome do jogador', 'error');
        }
    }

    // Função para confirmar exclusão de um jogador
    confirmDeletePlayer(playerName) {
        const playerStats = this.players[playerName];
        if (!playerStats) {
            this.showNotification('Jogador não encontrado!', 'error');
            return;
        }
        
        const message = `Tem certeza que deseja excluir "${playerName}"?\n\nEstatísticas:\n- ${playerStats.totalPoints} pontos\n- ${playerStats.gamesPlayed} partidas\n- ${playerStats.wins} vitórias\n\nEsta ação não pode ser desfeita!`;
        
        if (confirm(message)) {
            this.deletePlayer(playerName);
        }
    }

    // Mostrar notificação
    showNotification(message, type = 'info') {
        // Remover notificação existente
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Adicionar estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Inicializar event listeners
    initializeEventListeners() {
        // Botão adicionar resultado
        document.getElementById('addResult').addEventListener('click', async () => {
            const playerName = document.getElementById('playerName').value.trim();
            const position = document.getElementById('position').value;
            const totalPlayers = document.getElementById('totalPlayers').value;
            
            await this.addGameResult(playerName, position, totalPlayers);
        });

        // Enter no campo nome
        document.getElementById('playerName').addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                document.getElementById('addResult').click();
            }
        });

        // Botão recarregar dados
        document.getElementById('reloadData').addEventListener('click', async () => {
            this.showNotification('Recarregando dados do Supabase...', 'info');
            await this.forceReloadFromSupabase();
        });

        // Botão verificar conexão
        document.getElementById('checkConnection').addEventListener('click', async () => {
            await this.checkSupabaseConnection();
        });

        // Botão limpar dados
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Auto-focus no campo nome
        document.getElementById('playerName').focus();
    }

    // Processar reset semanal e salvar ganhadores
    async processWeeklyReset() {
        try {
            // Obter os 3 primeiros colocados do ranking atual
            const topPlayers = this.getTopThreePlayers();
            
            if (topPlayers.length > 0) {
                // Adicionar aos ganhadores semanais
                this.weeklyWinners.push({
                    week: this.currentWeek - 1,
                    winners: topPlayers,
                    date: new Date().toISOString()
                });
            }
            
            // Reset do ranking atual
            this.players = {};
            this.history = [];
            
            // Atualizar semana atual
            this.currentWeek = this.getCurrentWeekNumber();
            
            // Salvar dados atualizados
            await this.saveData();
            
            this.showNotification('🔄 Nova semana iniciada! Ranking resetado e ganhadores salvos.', 'success');
            
            // Atualizar interface
            this.updateRankingTable();
            this.updateWeeklyWinnersDisplay();
            
        } catch (error) {
            console.error('Erro ao processar reset semanal:', error);
            this.showNotification('Erro ao processar reset semanal: ' + error.message, 'error');
        }
    }

    // Obter os 3 primeiros colocados
    getTopThreePlayers() {
        const sortedPlayers = Object.values(this.players)
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                return (b.wins / Math.max(b.gamesPlayed, 1)) - (a.wins / Math.max(a.gamesPlayed, 1));
            });
        
        return sortedPlayers.slice(0, 3).map((player, index) => ({
            position: index + 1,
            name: player.name,
            points: player.totalPoints,
            wins: player.wins,
            games: player.gamesPlayed
        }));
    }

    // Atualizar display dos ganhadores semanais
    updateWeeklyWinnersDisplay() {
        // Atualizar semana atual
        const currentWeekElement = document.getElementById('currentWeekNumber');
        if (currentWeekElement) {
            currentWeekElement.textContent = this.currentWeek;
        }

        // Atualizar pódium da semana atual (se houver dados)
        const currentWeekWinners = this.getCurrentWeekWinners();
        this.updatePodium(currentWeekWinners);

        // Atualizar histórico de ganhadores
        this.updateWinnersHistory();
    }

    // Obter ganhadores da semana atual
    getCurrentWeekWinners() {
        const topPlayers = this.getTopThreePlayers();
        return {
            first: topPlayers[0] || null,
            second: topPlayers[1] || null,
            third: topPlayers[2] || null
        };
    }

    // Atualizar pódium
    updatePodium(winners) {
        // Primeiro lugar
        const firstElement = document.getElementById('weeklyFirst');
        const firstPointsElement = document.getElementById('weeklyFirstPoints');
        if (firstElement && firstPointsElement) {
            firstElement.textContent = winners.first ? winners.first.name : '-';
            firstPointsElement.textContent = winners.first ? `${winners.first.points} pts` : '0 pts';
        }

        // Segundo lugar
        const secondElement = document.getElementById('weeklySecond');
        const secondPointsElement = document.getElementById('weeklySecondPoints');
        if (secondElement && secondPointsElement) {
            secondElement.textContent = winners.second ? winners.second.name : '-';
            secondPointsElement.textContent = winners.second ? `${winners.second.points} pts` : '0 pts';
        }

        // Terceiro lugar
        const thirdElement = document.getElementById('weeklyThird');
        const thirdPointsElement = document.getElementById('weeklyThirdPoints');
        if (thirdElement && thirdPointsElement) {
            thirdElement.textContent = winners.third ? winners.third.name : '-';
            thirdPointsElement.textContent = winners.third ? `${winners.third.points} pts` : '0 pts';
        }
    }

    // Atualizar histórico de ganhadores
    updateWinnersHistory() {
        const historyContainer = document.getElementById('weeklyWinnersHistory');
        if (!historyContainer) return;

        if (this.weeklyWinners.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; font-style: italic;">Nenhum ganhador registrado ainda</p>';
            return;
        }

        const historyHTML = this.weeklyWinners
            .sort((a, b) => b.week - a.week) // Mais recente primeiro
            .map(weekData => {
                const winners = weekData.winners;
                return `
                    <div class="winner-history-item">
                        <div class="winner-week">Semana ${weekData.week}</div>
                        <div class="winner-podium">
                            ${winners[0] ? `
                                <div class="winner-position">
                                    <span class="icon">🥇</span>
                                    <span class="name">${winners[0].name}</span>
                                    <span class="points">(${winners[0].points}pts)</span>
                                </div>
                            ` : ''}
                            ${winners[1] ? `
                                <div class="winner-position">
                                    <span class="icon">🥈</span>
                                    <span class="name">${winners[1].name}</span>
                                    <span class="points">(${winners[1].points}pts)</span>
                                </div>
                            ` : ''}
                            ${winners[2] ? `
                                <div class="winner-position">
                                    <span class="icon">🥉</span>
                                    <span class="name">${winners[2].name}</span>
                                    <span class="points">(${winners[2].points}pts)</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            })
            .join('');

        historyContainer.innerHTML = historyHTML;
    }
}

// Adicionar estilos para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Inicializar aplicação quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.pokerRanking = new PokerRanking();
});

// Exportar para uso global
window.PokerRanking = PokerRanking;