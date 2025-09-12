// Sistema de Ranking de Poker
class PokerRanking {
    constructor() {
        this.players = this.loadData('players') || {};
        this.history = this.loadData('history') || [];
        this.initializeEventListeners();
        this.updateDisplay();
    }

    // Sistema de pontuação baseado na posição final
    calculatePoints(position, totalPlayers) {
        const pointsTable = {
            1: { 2: 10, 3: 15, 4: 20, 5: 25, 6: 30, 7: 35, 8: 40 },
            2: { 2: 5, 3: 8, 4: 12, 5: 15, 6: 18, 7: 21, 8: 24 },
            3: { 2: 0, 3: 4, 4: 6, 5: 8, 6: 10, 7: 12, 8: 14 },
            4: { 2: 0, 3: 0, 4: 2, 5: 4, 6: 6, 7: 8, 8: 10 },
            5: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 2, 7: 4, 8: 6 },
            6: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 2 },
            7: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
            8: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
        };
        
        return pointsTable[position]?.[totalPlayers] || 0;
    }

    // Adicionar resultado de partida
    addGameResult(playerName, position, totalPlayers) {
        if (!playerName || !position || !totalPlayers) {
            this.showNotification('Por favor, preencha todos os campos!', 'error');
            return false;
        }

        const points = this.calculatePoints(parseInt(position), parseInt(totalPlayers));
        const gameDate = new Date();

        // Atualizar dados do jogador
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
        this.players[playerName].positions.push(parseInt(position));
        
        if (parseInt(position) === 1) {
            this.players[playerName].wins += 1;
        }

        // Adicionar ao histórico
        this.history.unshift({
            id: Date.now(),
            playerName,
            position: parseInt(position),
            totalPlayers: parseInt(totalPlayers),
            points,
            date: gameDate.toISOString()
        });

        // Salvar dados
        this.saveData('players', this.players);
        this.saveData('history', this.history);

        // Atualizar display
        this.updateDisplay();
        this.clearForm();
        
        this.showNotification(`Resultado adicionado! ${playerName} ganhou ${points} pontos.`, 'success');
        return true;
    }

    // Obter ranking ordenado
    getRanking() {
        return Object.values(this.players)
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
                const avgA = a.positions.reduce((sum, pos) => sum + pos, 0) / a.positions.length;
                const avgB = b.positions.reduce((sum, pos) => sum + pos, 0) / b.positions.length;
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
                    <td colspan="6" class="empty-state">
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
            const average = player.positions.reduce((sum, pos) => sum + pos, 0) / player.positions.length;
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
    }

    // Limpar formulário
    clearForm() {
        document.getElementById('playerName').value = '';
        document.getElementById('position').value = '';
        document.getElementById('totalPlayers').value = '6';
    }

    // Limpar todos os dados
    clearAllData() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita!')) {
            this.players = {};
            this.history = [];
            this.saveData('players', this.players);
            this.saveData('history', this.history);
            this.updateDisplay();
            this.showNotification('Todos os dados foram limpos!', 'success');
        }
    }

    // Salvar dados no localStorage
    saveData(key, data) {
        try {
            localStorage.setItem(`pokerRanking_${key}`, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.showNotification('Erro ao salvar dados!', 'error');
        }
    }

    // Carregar dados do localStorage
    loadData(key) {
        try {
            const data = localStorage.getItem(`pokerRanking_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return null;
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
        document.getElementById('addResult').addEventListener('click', () => {
            const playerName = document.getElementById('playerName').value.trim();
            const position = document.getElementById('position').value;
            const totalPlayers = document.getElementById('totalPlayers').value;
            
            this.addGameResult(playerName, position, totalPlayers);
        });

        // Enter no campo nome
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('addResult').click();
            }
        });

        // Botão limpar dados
        document.getElementById('clearData').addEventListener('click', () => {
            this.clearAllData();
        });

        // Auto-focus no campo nome
        document.getElementById('playerName').focus();
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