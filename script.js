// ==========================================
// 1. CONEXIÓN A INTERNET REAL (API PÚBLICA)
// ==========================================
// Obtiene precios reales de Crypto para el Ticker
async function fetchMarketData() {
    try {
        // Usamos CoinGecko API que es gratuita y pública
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        
        const tickerEl = document.getElementById('marketTicker');
        tickerEl.innerHTML = ''; // Limpiar

        // Crear elementos del ticker
        const items = [
            { name: 'BTC', data: data.bitcoin },
            { name: 'ETH', data: data.ethereum },
            { name: 'SOL', data: data.solana },
            { name: 'USDT', data: data.tether }
        ];

        items.forEach(item => {
            const price = item.data.usd;
            const change = item.data.usd_24h_change.toFixed(2);
            const colorClass = change >= 0 ? 'text-green-400' : 'text-red-400';
            const icon = change >= 0 ? '▲' : '▼';
            
            tickerEl.innerHTML += `
                <span class="ticker__item">
                    ${item.name}: $${price} <span class="${colorClass}">(${icon} ${change}%)</span>
                </span>
            `;
        });
        // Repetir para efecto infinito
        tickerEl.innerHTML += tickerEl.innerHTML;
        
    } catch (error) {
        console.error("Error fetching market data", error);
        document.getElementById('marketTicker').innerHTML = '<span class="ticker__item text-yellow-500">Sin conexión a mercado (API Limitada)</span>';
    }
}
// Llamar al cargar y cada 60s
fetchMarketData();
setInterval(fetchMarketData, 60000);

// ==========================================
// 2. LÓGICA DE APLICACIÓN
// ==========================================
let financialData = {
    income: 0, expenses: 0, debt: 0,
    categories: { 'Vivienda': 0, 'Alimentación': 0, 'Transporte': 0, 'Entretenimiento': 0, 'Servicios': 0, 'Salud': 0, 'Otros': 0 },
    history: [1000, 1200, 1150, 1400, 1600, 1800]
};

// Inicialización de Gráficos
const ctxExpense = document.getElementById('expensesChart').getContext('2d');
const expenseChart = new Chart(ctxExpense, {
    type: 'doughnut',
    data: { labels: Object.keys(financialData.categories), datasets: [{ data: Object.values(financialData.categories), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } } }
});

const ctxNet = document.getElementById('netWorthChart').getContext('2d');
const netWorthChart = new Chart(ctxNet, {
    type: 'line',
    data: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], datasets: [{ label: 'Patrimonio', data: financialData.history, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
});

const ctxPort = document.getElementById('portfolioChart').getContext('2d');
let portfolioChart = new Chart(ctxPort, {
    type: 'bar',
    data: { labels: ['Renta Fija', 'Renta Variable'], datasets: [{ label: '%', data: [50, 50], backgroundColor: ['#10b981', '#3b82f6'], borderRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100 } } }
});

function registerTransaction(type, amount, category) {
    if (isNaN(amount) || amount <= 0) return;
    if (type === 'income') financialData.income += amount;
    else if (type === 'expense') {
        financialData.expenses += amount;
        if(financialData.categories[category] !== undefined) financialData.categories[category] += amount;
        else financialData.categories['Otros'] += amount;
        expenseChart.data.datasets[0].data = Object.values(financialData.categories);
        expenseChart.update();
    } else if (type === 'debt') financialData.debt = amount;

    updateDashboard();
    const currentNetWorth = financialData.income - financialData.expenses - financialData.debt;
    financialData.history.push(currentNetWorth > 0 ? currentNetWorth : 0);
    if(financialData.history.length > 6) financialData.history.shift();
    netWorthChart.update();
}

function updateDashboard() {
    const netWorth = financialData.income - financialData.expenses - financialData.debt;
    let savingsRate = financialData.income > 0 ? ((financialData.income - financialData.expenses) / financialData.income) * 100 : 0;
    let debtRatio = financialData.income > 0 ? (financialData.debt / financialData.income) * 100 : 0;

    document.getElementById('displayNetWorth').innerText = `$${netWorth.toFixed(2)}`;
    document.getElementById('displaySavingsRate').innerText = `${savingsRate.toFixed(1)}%`;
    document.getElementById('displayDebtRatio').innerText = `${debtRatio.toFixed(1)}%`;
    
    // Colores dinámicos
    document.getElementById('displaySavingsRate').className = `text-3xl font-bold ${savingsRate >= 20 ? 'text-green-600' : 'text-yellow-600'}`;
}

document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    registerTransaction(
        document.getElementById('type').value,
        parseFloat(document.getElementById('amount').value),
        document.getElementById('category').value
    );
    document.getElementById('amount').value = '';
});

function toggleDebtField() {
    const type = document.getElementById('type').value;
    const catWrapper = document.getElementById('categoryWrapper');
    type === 'debt' ? catWrapper.classList.add('hidden') : catWrapper.classList.remove('hidden');
}

// ==========================================
// 3. ENTRADA INTELIGENTE (REGEX LOCAL)
// ==========================================
// Procesa texto sin necesidad de API externa
function processLocalSmartInput() {
    const text = document.getElementById('smartInput').value.toLowerCase();
    
    // 1. Detectar Monto (Números)
    const amountMatch = text.match(/\d+(\.\d+)?/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

    // 2. Detectar Tipo (Gasto vs Ingreso)
    let type = 'expense'; // Default
    if (text.includes('ingreso') || text.includes('gané') || text.includes('salario') || text.includes('cobré')) {
        type = 'income';
    }

    // 3. Detectar Categoría (Palabras clave)
    let category = 'Otros';
    const keywords = {
        'Vivienda': ['casa', 'renta', 'luz', 'agua', 'internet'],
        'Alimentación': ['comida', 'cena', 'super', 'desayuno', 'restaurante'],
        'Transporte': ['gasolina', 'uber', 'taxi', 'bus', 'coche'],
        'Entretenimiento': ['cine', 'juego', 'salida', 'netflix'],
        'Salud': ['doctor', 'farmacia', 'medicina']
    };

    for (const [cat, words] of Object.entries(keywords)) {
        if (words.some(w => text.includes(w))) {
            category = cat;
            break;
        }
    }

    // Ejecutar
    if (amount > 0) {
        // Actualizar UI
        document.getElementById('type').value = type;
        document.getElementById('amount').value = amount;
        document.getElementById('category').value = category;
        toggleDebtField();
        
        // Registrar
        registerTransaction(type, amount, category);
        alert(`✅ Registrado: ${type === 'income' ? 'Ingreso' : 'Gasto'} de $${amount} en ${category}`);
        document.getElementById('smartInput').value = '';
    } else {
        alert("No detecté un monto válido. Intenta: 'Comida 200'");
    }
}

// ==========================================
// 4. CHATBOT LOCAL (BRAIN.JS)
// ==========================================
const net = new brain.NeuralNetwork();

// Entrenamos la red localmente al cargar
const trainingData = [
    { input: { hola: 1, buen: 1 }, output: { saludo: 1 } },
    { input: { consejo: 1, ahorro: 1 }, output: { consejo_ahorro: 1 } },
    { input: { como: 1, ahorrar: 1 }, output: { consejo_ahorro: 1 } },
    { input: { invertir: 1, dinero: 1 }, output: { consejo_inversion: 1 } },
    { input: { acciones: 1, bolsa: 1 }, output: { consejo_inversion: 1 } },
    { input: { deuda: 1, pagar: 1 }, output: { deuda: 1 } }
];

net.train(trainingData);

function encode(text) {
    const words = text.toLowerCase().split(' ');
    const vector = {};
    words.forEach(w => { if(w.length > 3) vector[w] = 1; });
    return vector;
}

function toggleChat() {
    const win = document.getElementById('chat-window');
    win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value;
    if(!text) return;
    
    // UI Usuario
    const container = document.getElementById('chat-messages');
    container.innerHTML += `<div class="msg msg-user">${text}</div>`;
    input.value = '';

    // Inferencia Brain.js
    const output = net.run(encode(text));
    let intent = 'unknown';
    let max = 0;
    for(const [key, val] of Object.entries(output)) {
        if(val > max) { max = val; intent = key; }
    }

    // Respuesta Lógica
    let response = "";
    const savings = financialData.income > 0 ? ((financialData.income - financialData.expenses) / financialData.income * 100).toFixed(1) : 0;

    if (intent === 'saludo') response = "¡Hola! Estoy listo para analizar tus finanzas.";
    else if (intent === 'consejo_ahorro') response = `Tu ahorro actual es del ${savings}%. Lo ideal es superar el 20%. Revisa tus gastos hormiga.`;
    else if (intent === 'consejo_inversion') response = "Depende de tu perfil. Si eres conservador, opta por Renta Fija. Si eres agresivo, ETFs y Acciones.";
    else if (intent === 'deuda') response = "Prioriza pagar las deudas con mayor tasa de interés primero (Método Avalancha).";
    else response = "No estoy seguro, pero te sugiero revisar tus gráficos de gastos.";

    // UI AI
    setTimeout(() => {
        container.innerHTML += `<div class="msg msg-ai">${response}</div>`;
        container.scrollTop = container.scrollHeight;
    }, 500);
}

// ==========================================
// 5. GESTIÓN PORTAFOLIO
// ==========================================
const portfolios = {
    conservador: { fixed: 70, equity: 30, desc: "Prioridad: Seguridad.", rec: [{type: 'Renta Fija', pct: '70%', tools: 'Bonos Gov'}, {type: 'Renta Variable', pct: '30%', tools: 'ETFs Dividendos'}] },
    moderado: { fixed: 50, equity: 50, desc: "Balance medio.", rec: [{type: 'Renta Fija', pct: '50%', tools: 'Deuda Corp.'}, {type: 'Renta Variable', pct: '50%', tools: 'S&P 500'}] },
    agresivo: { fixed: 30, equity: 70, desc: "Crecimiento alto.", rec: [{type: 'Renta Fija', pct: '30%', tools: 'Bonos Cortos'}, {type: 'Renta Variable', pct: '70%', tools: 'Tecnología/Crypto'}] }
};

function updatePortfolio() {
    const profile = document.getElementById('riskProfile').value;
    const data = portfolios[profile];
    document.getElementById('riskDescription').innerText = data.desc;
    document.getElementById('allocationList').innerHTML = `<li><strong>Renta Fija:</strong> ${data.fixed}%</li><li><strong>Renta Variable:</strong> ${data.equity}%</li>`;
    
    const tbody = document.getElementById('recommendationTable');
    tbody.innerHTML = '';
    data.rec.forEach(row => {
        tbody.innerHTML += `<tr><td><span class="badge ${row.type === 'Renta Fija' ? 'bg-green-500' : 'bg-blue-500'}">${row.type}</span></td><td class="font-bold">${row.pct}</td><td class="text-gray-600">${row.tools}</td></tr>`;
    });
    portfolioChart.data.datasets[0].data = [data.fixed, data.equity];
    portfolioChart.update();
}
updatePortfolio();

