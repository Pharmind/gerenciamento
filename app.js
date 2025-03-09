// Armazenamento local
const STORAGE_KEY = 'medstock_inventory';

// Dados iniciais
let inventory = loadInventory() || [];

// Elementos DOM
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close-modal');
const itemForm = document.getElementById('item-form');
const clearFormBtn = document.getElementById('clear-form');
const searchInput = document.getElementById('inventory-search');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const statusFilter = document.getElementById('status-filter');
const generatePdfBtn = document.getElementById('generate-pdf');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Atualizar dashboard
    updateDashboard();
    
    // Carregar tabela de estoque
    updateInventoryTable();
    
    // Event listeners
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    // Navegação
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            
            // Atualizar links ativos
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Mostrar página selecionada
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === targetPage) {
                    page.classList.add('active');
                }
            });
            
            // Atualizar conteúdo específico da página
            if (targetPage === 'inventory') {
                updateInventoryTable();
            } else if (targetPage === 'dashboard') {
                updateDashboard();
            }
        });
    });
    
    // Modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Formulário
    itemForm.addEventListener('submit', handleItemFormSubmit);
    clearFormBtn.addEventListener('click', clearItemForm);
    
    // Filtros e busca
    searchBtn.addEventListener('click', () => filterInventory());
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            filterInventory();
        }
    });
    
    categoryFilter.addEventListener('change', filterInventory);
    statusFilter.addEventListener('change', filterInventory);
    
    // Gerar PDF
    generatePdfBtn.addEventListener('click', generateReport);

    const menuToggle = document.querySelector('.menu-toggle');
    const header = document.querySelector('header');
    const menuOverlay = document.querySelector('.menu-overlay');

    menuToggle.addEventListener('click', () => {
        header.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    });

    menuOverlay.addEventListener('click', () => {
        header.classList.remove('active');
        menuOverlay.classList.remove('active');
    });

    // Close menu when clicking a nav link on mobile
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                header.classList.remove('active');
                menuOverlay.classList.remove('active');
            }
        });
    });
}

function handleItemFormSubmit(e) {
    e.preventDefault();
    
    const code = document.getElementById('item-code').value;
    const name = document.getElementById('item-name').value;
    const category = document.getElementById('item-category').value;
    const unit = document.getElementById('item-unit').value;
    const stock = parseFloat(document.getElementById('item-stock').value);
    const minStock = parseFloat(document.getElementById('item-min-stock').value);
    const dailyConsumption = parseFloat(document.getElementById('item-daily-consumption').value);
    const price = parseFloat(document.getElementById('item-price').value);
    const supplier = document.getElementById('item-supplier').value || '';
    const description = document.getElementById('item-description').value || '';
    
    // Validação apenas dos campos obrigatórios
    if (!code || !name || !category || !unit || isNaN(stock) || isNaN(minStock) || isNaN(dailyConsumption) || isNaN(price)) {
        showModal('Erro', 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    // Verificar se já existe
    const existingIndex = inventory.findIndex(item => item.code === code);
    
    const newItem = {
        code,
        name,
        category,
        unit,
        stock,
        minStock,
        dailyConsumption,
        price,
        supplier,
        description,
        lastUpdated: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
        // Atualizar item existente
        inventory[existingIndex] = newItem;
        showModal('Sucesso', `Item ${code} - ${name} atualizado com sucesso!`);
    } else {
        // Adicionar novo item
        inventory.push(newItem);
        showModal('Sucesso', `Item ${code} - ${name} cadastrado com sucesso!`);
    }
    
    // Salvar e atualizar UI
    saveInventory();
    clearItemForm();
    updateDashboard();
}

function clearItemForm() {
    itemForm.reset();
}

// Tabela de estoque
function updateInventoryTable(filteredItems = null) {
    const tableBody = document.querySelector('#inventory-table tbody');
    tableBody.innerHTML = '';
    
    const items = filteredItems || inventory;
    
    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center;">Nenhum item encontrado</td>
            </tr>
        `;
        return;
    }
    
    items.forEach(item => {
        const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
        const totalValue = (item.stock * item.price).toFixed(2);
        
        let status = 'normal';
        if (daysOfStock !== '∞') {
            if (daysOfStock < 15) {
                status = 'critical';
            } else if (daysOfStock <= 20) {
                status = 'low';
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${getCategoryName(item.category)}</td>
            <td>${item.stock} ${item.unit}</td>
            <td>${item.minStock} ${item.unit}</td>
            <td>${item.dailyConsumption} ${item.unit}</td>
            <td>${daysOfStock}</td>
            <td>R$ ${item.price.toFixed(2)}</td>
            <td>R$ ${totalValue}</td>
            <td><span class="status status-${status}">${getStatusName(status)}</span></td>
            <td class="action-buttons">
                <button class="btn-view" data-code="${item.code}">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                </button>
                <button class="btn-edit" data-code="${item.code}">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                <button class="btn-delete" data-code="${item.code}">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewItemDetails(btn.getAttribute('data-code')));
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editItem(btn.getAttribute('data-code')));
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.getAttribute('data-code')));
    });
}

function filterInventory() {
    const searchTerm = searchInput.value.toLowerCase();
    const categoryValue = categoryFilter.value;
    const statusValue = statusFilter.value;
    
    let filteredItems = [...inventory];
    
    // Filtrar por termo de busca
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.code.toLowerCase().includes(searchTerm) ||
            item.name.toLowerCase().includes(searchTerm) ||
            item.supplier.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtrar por categoria
    if (categoryValue !== 'all') {
        filteredItems = filteredItems.filter(item => item.category === categoryValue);
    }
    
    // Filtrar por status
    if (statusValue !== 'all') {
        filteredItems = filteredItems.filter(item => {
            const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
            
            if (daysOfStock === '∞') return statusValue === 'normal';
            
            if (statusValue === 'critical' && daysOfStock < 15) return true;
            if (statusValue === 'low' && daysOfStock >= 15 && daysOfStock <= 20) return true;
            if (statusValue === 'normal' && daysOfStock > 20) return true;
            
            return false;
        });
    }
    
    updateInventoryTable(filteredItems);
}

// Ações de itens
function viewItemDetails(code) {
    const item = inventory.find(item => item.code === code);
    
    if (!item) {
        showModal('Erro', 'Item não encontrado.');
        return;
    }
    
    const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
    const monthlyConsumption = (item.dailyConsumption * 30).toFixed(2);
    const totalValue = (item.stock * item.price).toFixed(2);
    const needed30Days = Math.max(0, (item.dailyConsumption * 30) - item.stock).toFixed(2);
    const needed45Days = Math.max(0, (item.dailyConsumption * 45) - item.stock).toFixed(2);
    const needed60Days = Math.max(0, (item.dailyConsumption * 60) - item.stock).toFixed(2);
    
    const lastUpdated = new Date(item.lastUpdated).toLocaleDateString('pt-BR');
    
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
        <div class="item-details">
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Código:</h4>
                    <p>${item.code}</p>
                </div>
                <div class="detail-group">
                    <h4>Nome:</h4>
                    <p>${item.name}</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Categoria:</h4>
                    <p>${getCategoryName(item.category)}</p>
                </div>
                <div class="detail-group">
                    <h4>Unidade:</h4>
                    <p>${item.unit}</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Estoque Atual:</h4>
                    <p>${item.stock} ${item.unit}</p>
                </div>
                <div class="detail-group">
                    <h4>Estoque Mínimo:</h4>
                    <p>${item.minStock} ${item.unit}</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Consumo Diário:</h4>
                    <p>${item.dailyConsumption} ${item.unit}/dia</p>
                </div>
                <div class="detail-group">
                    <h4>Consumo Mensal:</h4>
                    <p>${monthlyConsumption} ${item.unit}/mês</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Dias de Estoque:</h4>
                    <p>${daysOfStock} dias</p>
                </div>
                <div class="detail-group">
                    <h4>Valor Unitário:</h4>
                    <p>R$ ${item.price.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="detail-row">
                <div class="detail-group">
                    <h4>Valor Total em Estoque:</h4>
                    <p>R$ ${totalValue}</p>
                </div>
                <div class="detail-group">
                    <h4>Fornecedor:</h4>
                    <p>${item.supplier || 'Não informado'}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Projeção de Compras</h3>
                <div class="detail-row">
                    <div class="detail-group">
                        <h4>Necessário para 30 dias:</h4>
                        <p>${needed30Days} ${item.unit}</p>
                    </div>
                    <div class="detail-group">
                        <h4>Valor estimado:</h4>
                        <p>R$ ${(needed30Days * item.price).toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <h4>Necessário para 45 dias:</h4>
                        <p>${needed45Days} ${item.unit}</p>
                    </div>
                    <div class="detail-group">
                        <h4>Valor estimado:</h4>
                        <p>R$ ${(needed45Days * item.price).toFixed(2)}</p>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-group">
                        <h4>Necessário para 60 dias:</h4>
                        <p>${needed60Days} ${item.unit}</p>
                    </div>
                    <div class="detail-group">
                        <h4>Valor estimado:</h4>
                        <p>R$ ${(needed60Days * item.price).toFixed(2)}</p>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Descrição:</h4>
                <p>${item.description || 'Sem descrição'}</p>
            </div>
            
            <div class="detail-footer">
                <p>Última atualização: ${lastUpdated}</p>
            </div>
        </div>
    `;
    
    document.getElementById('modal-title').textContent = `Detalhes do Item: ${item.name}`;
    modal.style.display = 'flex';
}

function editItem(code) {
    const item = inventory.find(item => item.code === code);
    
    if (!item) {
        showModal('Erro', 'Item não encontrado.');
        return;
    }
    
    // Preencher formulário
    document.getElementById('item-code').value = item.code;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-category').value = item.category;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-stock').value = item.stock;
    document.getElementById('item-min-stock').value = item.minStock;
    document.getElementById('item-daily-consumption').value = item.dailyConsumption;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-supplier').value = item.supplier || '';
    document.getElementById('item-description').value = item.description || '';
    
    // Navegar para página de cadastro
    document.querySelector('[data-page="register"]').click();
}

function deleteItem(code) {
    const item = inventory.find(item => item.code === code);
    
    if (!item) {
        showModal('Erro', 'Item não encontrado.');
        return;
    }
    
    if (confirm(`Tem certeza que deseja excluir o item ${item.code} - ${item.name}?`)) {
        inventory = inventory.filter(i => i.code !== code);
        saveInventory();
        updateInventoryTable();
        updateDashboard();
        
        showModal('Sucesso', `Item ${item.code} - ${item.name} excluído com sucesso!`);
    }
}

// Dashboard
function updateDashboard() {
    // Atualizar cards de resumo
    updateSummaryCards();
    
    // Criar gráficos
    createCategoryChart();
    createValueChart();
    createCriticalChart();
    createConsumptionChart();
}

function updateSummaryCards() {
    // Total de itens
    document.getElementById('total-items').textContent = inventory.length;
    
    // Itens críticos
    const criticalItems = inventory.filter(item => {
        const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
        return daysOfStock !== '∞' && daysOfStock < 15;
    }).length;
    
    document.getElementById('critical-items').textContent = criticalItems;
    
    // Valor em estoque
    const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
    document.getElementById('stock-value').textContent = `R$ ${totalValue.toFixed(2)}`;
    
    // Compras recomendadas
    const recommendedPurchases = inventory.filter(item => {
        const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
        return daysOfStock !== '∞' && daysOfStock < 20;
    }).length;
    document.getElementById('recommended-purchases').textContent = recommendedPurchases;
}

function createCategoryChart() {
    const ctx = document.getElementById('category-chart');
    
    // Limpar canvas anterior
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    // Contar itens por categoria
    const categories = {
        psicotrópicos: 0,
        antibióticos: 0,
        vasoativas: 0,
        gerais: 0,
        materiais: 0,
        dietas: 0
    };
    
    inventory.forEach(item => {
        categories[item.category]++;
    });
    
    // Criar gráfico
    ctx.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories).map(getCategoryName),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12',
                    '#9b59b6',
                    '#1abc9c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createValueChart() {
    const ctx = document.getElementById('value-chart');
    
    // Limpar canvas anterior
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    // Calcular valor por categoria
    const categories = {
        psicotrópicos: 0,
        antibióticos: 0,
        vasoativas: 0,
        gerais: 0,
        materiais: 0,
        dietas: 0
    };
    
    inventory.forEach(item => {
        categories[item.category] += item.stock * item.price;
    });
    
    // Criar gráfico
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categories).map(getCategoryName),
            datasets: [{
                label: 'Valor em Estoque (R$)',
                data: Object.values(categories).map(val => parseFloat(val.toFixed(2))),
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createCriticalChart() {
    const ctx = document.getElementById('critical-chart');
    
    // Limpar canvas anterior
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    // Contar itens críticos por categoria
    const categories = {
        psicotrópicos: { normal: 0, low: 0, critical: 0 },
        antibióticos: { normal: 0, low: 0, critical: 0 },
        vasoativas: { normal: 0, low: 0, critical: 0 },
        gerais: { normal: 0, low: 0, critical: 0 },
        materiais: { normal: 0, low: 0, critical: 0 },
        dietas: { normal: 0, low: 0, critical: 0 }
    };
    
    inventory.forEach(item => {
        const ratio = item.stock / item.minStock;
        
        if (ratio <= 0.5) {
            categories[item.category].critical++;
        } else if (ratio <= 1) {
            categories[item.category].low++;
        } else {
            categories[item.category].normal++;
        }
    });
    
    // Criar gráfico
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categories).map(getCategoryName),
            datasets: [
                {
                    label: 'Normal',
                    data: Object.values(categories).map(val => val.normal),
                    backgroundColor: '#2ecc71'
                },
                {
                    label: 'Baixo',
                    data: Object.values(categories).map(val => val.low),
                    backgroundColor: '#f39c12'
                },
                {
                    label: 'Crítico',
                    data: Object.values(categories).map(val => val.critical),
                    backgroundColor: '#e74c3c'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

function createConsumptionChart() {
    const ctx = document.getElementById('consumption-chart');
    
    // Limpar canvas anterior
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    // Calcular consumo mensal por categoria
    const categories = {
        psicotrópicos: 0,
        antibióticos: 0,
        vasoativas: 0,
        gerais: 0,
        materiais: 0,
        dietas: 0
    };
    
    inventory.forEach(item => {
        categories[item.category] += item.dailyConsumption * 30;
    });
    
    // Criar gráfico
    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Atual', '30 dias', '60 dias', '90 dias'],
            datasets: Object.keys(categories).map((category, index) => {
                const monthlyConsumption = categories[category];
                const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
                
                return {
                    label: getCategoryName(category),
                    data: [0, monthlyConsumption, monthlyConsumption * 2, monthlyConsumption * 3],
                    borderColor: colors[index % colors.length],
                    backgroundColor: 'transparent'
                };
            })
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateReport() {
    try {
        const doc = new window.jspdf.jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Title and Header
        doc.setFontSize(20);
        doc.setTextColor(231, 76, 60);
        doc.text('Relatório de Gestão de Estoque', 14, 20);
        
        // Date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
        
        // 1. Summary Section
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94);
        doc.text('1. Sumário Executivo', 14, 45);
        
        const criticalItems = inventory.filter(item => {
            const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
            return daysOfStock !== '∞' && daysOfStock < 15;
        });
        
        const lowItems = inventory.filter(item => {
            const daysOfStock = item.dailyConsumption > 0 ? Math.round(item.stock / item.dailyConsumption) : '∞';
            return daysOfStock !== '∞' && daysOfStock >= 15 && daysOfStock <= 20;
        });
        
        const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
        
        doc.setFontSize(12);
        doc.text([
            `Total de Itens: ${inventory.length}`,
            `Itens Críticos: ${criticalItems.length}`,
            `Itens com Estoque Baixo: ${lowItems.length}`,
            `Valor Total em Estoque: R$ ${totalValue.toFixed(2)}`
        ], 14, 55);
        
        // 2. Critical Items Analysis
        doc.text('2. Análise de Itens Críticos', 14, 85);
        
        // Table of critical items
        const criticalItemsData = criticalItems.map(item => {
            const daysRemaining = Math.round(item.stock / item.dailyConsumption);
            const neededValue = ((item.dailyConsumption * 30) - item.stock) * item.price;
            return [
                item.code,
                item.name,
                daysRemaining,
                getCategoryName(item.category),
                `R$ ${neededValue.toFixed(2)}`
            ];
        });
        
        doc.autoTable({
            startY: 90,
            head: [['Código', 'Nome', 'Dias Restantes', 'Categoria', 'Valor Necessário']],
            body: criticalItemsData
        });
        
        // 3. Recommendations Section
        doc.addPage();
        doc.setFontSize(16);
        doc.text('3. Recomendações e Ações Prioritárias', 14, 20);
        
        // Priority Purchase Analysis
        doc.setFontSize(14);
        doc.text('3.1 Priorização de Compras', 14, 35);
        doc.setFontSize(12);
        
        const priorityItems = criticalItems
            .sort((a, b) => (a.stock / a.dailyConsumption) - (b.stock / b.dailyConsumption))
            .slice(0, 5);
            
        const priorityData = priorityItems.map(item => {
            const daysRemaining = Math.round(item.stock / item.dailyConsumption);
            const needed30Days = Math.max(0, (item.dailyConsumption * 30) - item.stock);
            const needed60Days = Math.max(0, (item.dailyConsumption * 60) - item.stock);
            const suggestedQuantity = Math.ceil(needed60Days * 1.1); // 10% buffer

            return [
                item.code,
                item.name,
                daysRemaining,
                `${item.stock} ${item.unit}`,
                `${item.dailyConsumption} ${item.unit}/dia`,
                `${suggestedQuantity} ${item.unit}`,
                `R$ ${(item.price * suggestedQuantity).toFixed(2)}`
            ];
        });
        
        doc.autoTable({
            startY: 40,
            head: [['Código', 'Nome', 'Dias Rest.', 'Estoque', 'Consumo', 'Qtd. Sugerida', 'Investimento']],
            body: priorityData,
            theme: 'striped'
        });

        let currentY = doc.autoTable.previous.finalY + 15;

        // Add purchase recommendations explanation
        doc.setFontSize(11);
        doc.setTextColor(52, 73, 94);
        const recommendations = [
            'Recomendações de Compra:',
            '• As quantidades sugeridas consideram cobertura para 60 dias + 10% de segurança',
            '• Considerar lote mínimo de compra do fornecedor',
            '• Avaliar condições de armazenamento disponíveis',
            '• Verificar prazo de validade dos produtos',
            '• Considerar sazonalidade do consumo'
        ];

        recommendations.forEach(text => {
            doc.text(text, 14, currentY);
            currentY += 7;
        });

        // Minimum Stock Review
        doc.text('3.2 Revisão de Parâmetros de Estoque Mínimo', 14, currentY + 10);
        
        const stockReviewItems = inventory.filter(item => 
            item.stock < item.minStock && item.dailyConsumption > 0
        ).slice(0, 5);
        
        const stockReviewData = stockReviewItems.map(item => [
            item.code,
            item.name,
            `${item.minStock} ${item.unit}`,
            `${item.stock} ${item.unit}`,
            `${Math.round((item.stock / item.minStock) * 100)}%`
        ]);
        
        doc.autoTable({
            startY: currentY + 20,
            head: [['Código', 'Nome', 'Est. Mínimo', 'Est. Atual', '% do Mínimo']],
            body: stockReviewData
        });
        
        currentY = doc.autoTable.previous.finalY + 15;
        
        // Supplier Analysis
        doc.text('3.3 Análise de Fornecedores', 14, currentY);
        
        const supplierAnalysis = {};
        criticalItems.forEach(item => {
            if (!supplierAnalysis[item.supplier]) {
                supplierAnalysis[item.supplier] = 1;
            } else {
                supplierAnalysis[item.supplier]++;
            }
        });
        
        const supplierData = Object.entries(supplierAnalysis).map(([supplier, count]) => [
            supplier || 'Não informado',
            count,
            `${((count / criticalItems.length) * 100).toFixed(1)}%`
        ]);
        
        doc.autoTable({
            startY: currentY + 5,
            head: [['Fornecedor', 'Itens Críticos', '% do Total']],
            body: supplierData
        });
        
        // Alert System Recommendations
        doc.addPage();
        doc.setFontSize(14);
        doc.text('3.4 Sistema de Alertas Recomendado', 14, 20);
        
        currentY = 35;
        const alertRecommendations = [
            'Alertas Diários:',
            '• Itens com menos de 5 dias de estoque',
            '• Itens abaixo do estoque mínimo',
            'Alertas Semanais:',
            '• Projeção de consumo vs. estoque disponível',
            '• Variações significativas no consumo médio',
            'Alertas Mensais:',
            '• Análise de tendências de consumo',
            '• Revisão de parâmetros de estoque'
        ];
        
        doc.setFontSize(12);
        alertRecommendations.forEach(text => {
            doc.text(text, 14, currentY);
            currentY += 8;
        });
        
        // Seasonality Analysis
        doc.text('3.5 Análise de Sazonalidade', 14, currentY + 10);
        
        currentY += 25;
        const seasonalityRecommendations = [
            '• Implementar coleta de dados históricos de consumo',
            '• Analisar padrões de consumo por período',
            '• Identificar fatores externos que afetam a demanda',
            '• Ajustar estoques mínimos conforme sazonalidade',
            '• Planejar compras considerando períodos de alta demanda'
        ];
        
        seasonalityRecommendations.forEach(text => {
            doc.text(text, 14, currentY);
            currentY += 8;
        });
        
        // Final Recommendations
        doc.text('4. Conclusões e Próximos Passos', 14, currentY + 15);
        
        currentY += 30;
        const conclusions = [
            `• ${criticalItems.length} itens requerem ação imediata`,
            `• Necessidade de investimento total: R$ ${criticalItems.reduce((sum, item) => 
                sum + (item.dailyConsumption * 30 - item.stock) * item.price, 0).toFixed(2)}`,
            '• Revisar contratos com fornecedores principais',
            '• Implementar sistema de alertas automatizado',
            '• Estabelecer cronograma de revisão periódica'
        ];
        
        conclusions.forEach(text => {
            doc.text(text, 14, currentY);
            currentY += 8;
        });
        
        // Save PDF
        doc.save(`relatorio_farmaceutico_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
        
        // Show success message
        showModal('Sucesso', 'Relatório gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showModal('Erro', 'Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.');
    }
}

// Utilitários
function showModal(title, message) {
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = title;
    modalContent.innerHTML = `<p>${message}</p>`;
    
    modal.style.display = 'flex';
}

function getCategoryName(category) {
    const categories = {
        psicotrópicos: 'Psicotrópicos',
        antibióticos: 'Antibióticos',
        vasoativas: 'Drogas Vasoativas',
        gerais: 'Medicamentos Gerais',
        materiais: 'Materiais',
        dietas: 'Dietas'
    };
    
    return categories[category] || category;
}

function getStatusName(status) {
    const statuses = {
        normal: 'Normal',
        low: 'Baixo',
        critical: 'Crítico'
    };
    
    return statuses[status] || status;
}

// Local Storage
function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function loadInventory() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
}

// Dados de exemplo para teste (remover em produção)
if (!inventory.length) {
    // Medicamentos
    inventory = [
        { code: 'PSI001', name: 'Clonazepam 2mg', category: 'psicotrópicos', unit: 'comprimido', stock: 500, minStock: 200, dailyConsumption: 15, price: 0.35, supplier: 'Farmex', description: 'Controle de ansiedade e convulsões', lastUpdated: new Date().toISOString() },
        { code: 'PSI002', name: 'Diazepam 10mg', category: 'psicotrópicos', unit: 'comprimido', stock: 300, minStock: 150, dailyConsumption: 10, price: 0.25, supplier: 'MedPharma', description: 'Sedativo e ansiolítico', lastUpdated: new Date().toISOString() },
        { code: 'PSI003', name: 'Midazolam 5mg/ml', category: 'psicotrópicos', unit: 'ampola', stock: 80, minStock: 50, dailyConsumption: 2.5, price: 12.90, supplier: 'HospitalCare', description: 'Anestésico de curta duração', lastUpdated: new Date().toISOString() },
        { code: 'ANT001', name: 'Amoxicilina 500mg', category: 'antibióticos', unit: 'comprimido', stock: 600, minStock: 250, dailyConsumption: 20, price: 0.45, supplier: 'BioMed', description: 'Antibiótico de amplo espectro', lastUpdated: new Date().toISOString() },
        { code: 'ANT002', name: 'Ciprofloxacino 500mg', category: 'antibióticos', unit: 'comprimido', stock: 400, minStock: 200, dailyConsumption: 15, price: 0.65, supplier: 'MedPharma', description: 'Antibiótico para infecções por gram-negativos', lastUpdated: new Date().toISOString() },
        { code: 'ANT003', name: 'Ceftriaxona 1g', category: 'antibióticos', unit: 'frasco', stock: 90, minStock: 45, dailyConsumption: 3, price: 15.80, supplier: 'HospitalCare', description: 'Cefalosporina de terceira geração', lastUpdated: new Date().toISOString() },
        { code: 'VAS001', name: 'Norepinefrina 2mg/ml', category: 'vasoativas', unit: 'ampola', stock: 40, minStock: 25, dailyConsumption: 1.2, price: 22.50, supplier: 'HospitalCare', description: 'Vasopressor para choque séptico', lastUpdated: new Date().toISOString() },
        { code: 'VAS002', name: 'Dobutamina 250mg', category: 'vasoativas', unit: 'ampola', stock: 30, minStock: 20, dailyConsumption: 1, price: 18.35, supplier: 'Farmex', description: 'Inotrópico para insuficiência cardíaca', lastUpdated: new Date().toISOString() },
        { code: 'VAS003', name: 'Epinefrina 1mg/ml', category: 'vasoativas', unit: 'ampola', stock: 60, minStock: 30, dailyConsumption: 1.5, price: 8.90, supplier: 'BioMed', description: 'Estimulante cardíaco para PCR', lastUpdated: new Date().toISOString() },
        { code: 'GER001', name: 'Dipirona 500mg', category: 'gerais', unit: 'comprimido', stock: 800, minStock: 250, dailyConsumption: 25, price: 0.15, supplier: 'MedPharma', description: 'Analgésico e antitérmico', lastUpdated: new Date().toISOString() },
        { code: 'GER002', name: 'Omeprazol 20mg', category: 'gerais', unit: 'comprimido', stock: 700, minStock: 200, dailyConsumption: 22, price: 0.20, supplier: 'Farmex', description: 'Inibidor da bomba de prótons', lastUpdated: new Date().toISOString() },
        { code: 'GER003', name: 'Furosemida 40mg', category: 'gerais', unit: 'comprimido', stock: 450, minStock: 180, dailyConsumption: 12, price: 0.18, supplier: 'BioMed', description: 'Diurético de alça', lastUpdated: new Date().toISOString() },
        
        // Materiais
        { code: 'MAT001', name: 'Seringa 10ml', category: 'materiais', unit: 'unidade', stock: 1200, minStock: 400, dailyConsumption: 40, price: 0.65, supplier: 'HospitalCare', description: 'Seringa descartável', lastUpdated: new Date().toISOString() },
        { code: 'MAT002', name: 'Agulha 40x12', category: 'materiais', unit: 'unidade', stock: 2000, minStock: 500, dailyConsumption: 60, price: 0.25, supplier: 'MedicalSupplies', description: 'Agulha descartável', lastUpdated: new Date().toISOString() },
        { code: 'MAT003', name: 'Equipo Macrogotas', category: 'materiais', unit: 'unidade', stock: 350, minStock: 150, dailyConsumption: 12, price: 2.10, supplier: 'HospitalCare', description: 'Equipo para soro', lastUpdated: new Date().toISOString() },
        { code: 'MAT004', name: 'Cateter Intravenoso 20G', category: 'materiais', unit: 'unidade', stock: 300, minStock: 120, dailyConsumption: 10, price: 3.25, supplier: 'MedicalSupplies', description: 'Cateter para acesso venoso', lastUpdated: new Date().toISOString() },
        { code: 'MAT005', name: 'Luva de Procedimento M', category: 'materiais', unit: 'caixa', stock: 80, minStock: 35, dailyConsumption: 2.5, price: 35.90, supplier: 'ProtectCare', description: 'Caixa com 100 unidades', lastUpdated: new Date().toISOString() },
        
        // Dietas
        { code: 'DIE001', name: 'Dieta Enteral Padrão', category: 'dietas', unit: 'frasco', stock: 200, minStock: 80, dailyConsumption: 8, price: 18.50, supplier: 'NutriMed', description: 'Dieta 1.0 kcal/ml', lastUpdated: new Date().toISOString() },
        { code: 'DIE002', name: 'Dieta Hipercalórica', category: 'dietas', unit: 'frasco', stock: 120, minStock: 60, dailyConsumption: 5, price: 24.90, supplier: 'NutriMed', description: 'Dieta 1.5 kcal/ml', lastUpdated: new Date().toISOString() },
        { code: 'DIE003', name: 'Dieta para Diabéticos', category: 'dietas', unit: 'frasco', stock: 90, minStock: 50, dailyConsumption: 4, price: 27.80, supplier: 'NutriCare', description: 'Dieta com baixo índice glicêmico', lastUpdated: new Date().toISOString() }
    ];
    
    saveInventory();
}