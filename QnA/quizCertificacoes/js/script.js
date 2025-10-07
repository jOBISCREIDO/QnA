let quizData = [];
let shuffledQuizData = [];
const quiz = document.getElementById('quiz');
const submitBtn = document.getElementById('submit');
const results = document.getElementById('results');
const feedback = document.getElementById('feedback');
const progressBar = document.getElementById('progress-bar');
const counter = document.getElementById('counter');
const certificationSelect = document.getElementById('certification-select');
const quizTitle = document.getElementById('quiz-title');
const certificationBadge = document.getElementById('certification-badge');
const jsonInput = document.getElementById('json-input');
const jsonFeedback = document.getElementById('json-feedback');
const addQuestionsJsonBtn = document.getElementById('add-questions-json');
let currentQuestionIndex = 0;
let numCorrect = 0;
let numIncorrect = 0;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / shuffledQuizData.length) * 100;
    progressBar.style.width = `${progress}%`;
    counter.innerHTML = `${currentQuestionIndex + 1}/${shuffledQuizData.length} | ${numIncorrect} erradas | ${numCorrect} certas`;
}

function loadQuiz() {
    feedback.innerHTML = '';
    const currentQuestion = shuffledQuizData[currentQuestionIndex];
    const answers = [];
    const letters = ['a', 'b', 'c', 'd'];
    const shuffledAnswers = letters.map(letter => ({ letter, text: currentQuestion[letter] }));
    shuffle(shuffledAnswers);
    shuffledAnswers.forEach(({ letter, text }, index) => {
        answers.push(
            `<label>
                <input type="radio" name="question" value="${letter}">
                ${letters[index]} : ${text}
            </label>`
        );
    });
    quiz.innerHTML = `<div class="question">${currentQuestionIndex + 1}. ${currentQuestion.question}</div>
                      <div class="answers">${answers.join('')}</div>`;
    updateProgress();
}

let wrongQuestions = [];

function showResults() {
    const answerContainer = quiz.querySelector('.answers');
    const selector = `input[name=question]:checked`;
    const userAnswer = (answerContainer.querySelector(selector) || {}).value;
    const currentQuestion = shuffledQuizData[currentQuestionIndex];

    if (!userAnswer) {
        feedback.innerHTML = 'Por favor, selecione uma resposta.';
        feedback.style.color = 'orange';
        return;
    }

    if (userAnswer === currentQuestion.correct) {
        numCorrect++;
        feedback.innerHTML = 'Resposta Correta';
        feedback.style.color = 'green';
    } else {
        numIncorrect++;
        feedback.innerHTML = `Resposta Incorreta<br>Resposta correta: ${currentQuestion[currentQuestion.correct]}`;
        feedback.style.color = 'red';
        wrongQuestions.push({
            question: currentQuestion.question,
            userAnswer: currentQuestion[userAnswer],
            correctAnswer: currentQuestion[currentQuestion.correct]
        });
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < shuffledQuizData.length) {
            loadQuiz();
        } else {
            showFinalResults();
        }
    }, 2000);
}

function filterQuestionsByGroup(data, groupId) {
    if (groupId === 'default') {
        return data.defaultQuestions || [];
    }
    return data.groups && data.groups[groupId] ? data.groups[groupId] : [];
}

async function getQuestionsFromGroup(fileName, groupId) {
    const data = await loadQuizData(fileName);
    return filterQuestionsByGroup(data, groupId);
}

function updateGroupSelect(data) {
    const groupSelect = document.getElementById('question-group-select');
    const addGroupSelect = document.getElementById('add-group-select');
    
    // Limpar opções existentes, mantendo apenas o grupo padrão no select principal
    groupSelect.innerHTML = '<option value="default">Grupo Padrão</option>';
    addGroupSelect.innerHTML = '<option value="new">Criar Novo Grupo</option>';
    
    // Adicionar grupos existentes
    if (data.groups) {
        Object.keys(data.groups).forEach(groupId => {
            groupSelect.add(new Option(`Grupo ${groupId}`, groupId));
            addGroupSelect.add(new Option(`Grupo ${groupId}`, groupId));
        });
    }
}

// Função para carregar dados do localStorage ou do arquivo JSON
async function loadQuizData(fileName) {
    const storageKey = `quiz_${fileName}`;
    let storedData = localStorage.getItem(storageKey);
    
    try {
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData && (parsedData.defaultQuestions || parsedData.groups)) {
                return parsedData;
            }
        }
        
        // Se não houver dados válidos no localStorage, carrega do arquivo JSON
        const response = await fetch(`./json/${fileName}`);
        const jsonData = await response.json();
        
        // Organiza as perguntas em grupo padrão se necessário
        const data = {
            defaultQuestions: Array.isArray(jsonData) ? jsonData : (jsonData.defaultQuestions || []),
            groups: jsonData.groups || {}
        };
        
        // Salva no localStorage
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return {
            defaultQuestions: [],
            groups: {}
        };
    }
}

// Função para salvar dados no localStorage
function saveQuizData(fileName, data) {
    try {
        const storageKey = `quiz_${fileName}`;
        
        // Garante que temos a estrutura correta
        const safeData = {
            defaultQuestions: data.defaultQuestions || [],
            groups: data.groups || {}
        };
        
        localStorage.setItem(storageKey, JSON.stringify(safeData));
        return safeData;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        throw new Error('Erro ao salvar os dados. Por favor, tente novamente.');
    }
}

async function importQuestionsFromJson() {
    try {
        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            throw new Error('Por favor, insira o JSON com as perguntas.');
        }

        const importData = JSON.parse(jsonText);
        
        // Validar estrutura do JSON importado
        if (!importData.questions || !Array.isArray(importData.questions)) {
            throw new Error('O JSON deve conter um array de perguntas no campo "questions".');
        }

        if (!importData.groupName) {
            throw new Error('O JSON deve especificar um nome de grupo no campo "groupName".');
        }

        // Extrair o nome do grupo (remover a palavra "Grupo" se presente)
        const groupName = importData.groupName.replace(/^Grupo\s+/i, '').toUpperCase();

        // Validar estrutura das perguntas
        importData.questions.forEach((question, index) => {
            if (!question.question || !question.a || !question.b || !question.c || !question.d || !question.correct) {
                throw new Error(`Pergunta ${index + 1} está com formato inválido. Cada pergunta deve ter: question, a, b, c, d, e correct.`);
            }
            if (!['a', 'b', 'c', 'd'].includes(question.correct)) {
                throw new Error(`Pergunta ${index + 1} tem uma resposta correta inválida. Deve ser 'a', 'b', 'c' ou 'd'.`);
            }
        });

        // Carregar dados atuais
        const fileName = document.getElementById('add-certification-select').value;
        let currentData = await loadQuizData(fileName);

        // Inicializar a estrutura se necessário
        if (!currentData.groups) {
            currentData.groups = {};
        }

        // Criar ou acessar o grupo
        if (!currentData.groups[groupName]) {
            currentData.groups[groupName] = [];
        }

        // Adicionar as perguntas ao grupo
        currentData.groups[groupName].push(...importData.questions);

        // Salvar dados atualizados
        saveQuizData(fileName, currentData);

        // Atualizar os selects de grupo
        updateGroupSelect(currentData);

        // Limpar o input e mostrar mensagem de sucesso
        jsonInput.value = '';
        jsonFeedback.textContent = `${importData.questions.length} perguntas importadas com sucesso para o grupo ${groupName}!`;
        jsonFeedback.className = 'success';

    } catch (error) {
        jsonFeedback.textContent = `Erro: ${error.message}`;
        jsonFeedback.className = 'error';
        console.error('Erro ao importar perguntas:', error);
    }
}

async function fetchQuizData(fileName) {
    try {
        const groupSelect = document.getElementById('question-group-select');
        
        // Carregar dados e atualizar grupos
        const data = await loadQuizData(fileName);
        quizData = data;
        updateGroupSelect(data);
        
        // Carregar perguntas do grupo selecionado
        const groupQuestions = await getQuestionsFromGroup(fileName, groupSelect.value);
        
        if (groupQuestions && groupQuestions.length > 0) {
            shuffledQuizData = [...groupQuestions];
            shuffle(shuffledQuizData);
            loadQuiz();
        } else {
            quiz.innerHTML = '<div class="question">Nenhuma pergunta encontrada neste grupo.</div>';
            progressBar.style.width = '0%';
            counter.innerHTML = '0/0 | 0 erradas | 0 certas';
        }
    } catch (error) {
        console.error('Erro ao carregar os dados:', error);
        quiz.innerHTML = '<div class="question">Erro ao carregar as perguntas.</div>';
    }
}

// Gerenciamento de abas
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabId) {
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        }
    });

    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId + '-tab') {
            content.classList.add('active');
        }
    });
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        switchTab(button.dataset.tab);
    });
});

async function importQuestionsFromJson() {
    try {
        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            throw new Error('Por favor, insira o JSON com as perguntas.');
        }

        const importData = JSON.parse(jsonText);
        
        // Validar estrutura do JSON importado
        if (!importData.questions || !Array.isArray(importData.questions)) {
            throw new Error('O JSON deve conter um array de perguntas no campo "questions".');
        }

        if (!importData.groupName) {
            throw new Error('O JSON deve especificar um nome de grupo no campo "groupName".');
        }

        // Extrair o nome do grupo (remover a palavra "Grupo" se presente)
        const groupName = importData.groupName.replace(/^Grupo\s+/i, '').toUpperCase();

        // Validar estrutura das perguntas
        importData.questions.forEach((question, index) => {
            if (!question.question || !question.a || !question.b || !question.c || !question.d || !question.correct) {
                throw new Error(`Pergunta ${index + 1} está com formato inválido. Cada pergunta deve ter: question, a, b, c, d, e correct.`);
            }
            if (!['a', 'b', 'c', 'd'].includes(question.correct)) {
                throw new Error(`Pergunta ${index + 1} tem uma resposta correta inválida. Deve ser 'a', 'b', 'c' ou 'd'.`);
            }
        });

        // Carregar dados atuais
        const fileName = document.getElementById('add-certification-select').value;
        let currentData = await loadQuizData(fileName);

        // Inicializar a estrutura se necessário
        if (!currentData.groups) {
            currentData.groups = {};
        }

        // Criar ou acessar o grupo
        if (!currentData.groups[groupName]) {
            currentData.groups[groupName] = [];
        }

        // Adicionar as perguntas ao grupo
        currentData.groups[groupName].push(...importData.questions);

        // Salvar dados atualizados
        saveQuizData(fileName, currentData);

        // Atualizar os selects de grupo
        updateGroupSelect(currentData);

        // Limpar o input e mostrar mensagem de sucesso
        jsonInput.value = '';
        jsonFeedback.textContent = `${importData.questions.length} perguntas importadas com sucesso para o grupo ${groupName}!`;
        jsonFeedback.className = 'success';

    } catch (error) {
        jsonFeedback.textContent = `Erro: ${error.message}`;
        jsonFeedback.className = 'error';
        console.error('Erro ao importar perguntas:', error);
    }
}

// Gerenciamento de perguntas
const addCertificationSelect = document.getElementById('add-certification-select');

// Gerenciamento do formulário
const methodButtons = document.querySelectorAll('.method-button');
const inputMethods = document.querySelectorAll('.input-method');
const questionText = document.getElementById('question-text');
const alternativesContainer = document.getElementById('alternatives-container');
const addAlternativeBtn = document.getElementById('add-alternative');
const addQuestionFormBtn = document.getElementById('add-question-form');

// Alternância entre métodos de entrada
methodButtons.forEach(button => {
    button.addEventListener('click', () => {
        const method = button.dataset.method;
        
        // Atualizar botões
        methodButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Mostrar/esconder métodos
        document.getElementById('form-method').style.display = 'none';
        document.getElementById('json-method').style.display = 'none';
        document.getElementById(`${method}-method`).style.display = 'block';
        methodButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Mostrar/esconder métodos
        inputMethods.forEach(method => method.style.display = 'none');
        document.getElementById(`${method}-method`).style.display = 'block';
    });
});



document.getElementById('question-group-select').addEventListener('change', (event) => {
    currentQuestionIndex = 0;
    numCorrect = 0;
    numIncorrect = 0;
    getQuestionsFromGroup(certificationSelect.value, event.target.value)
        .then(groupQuestions => {
            shuffledQuizData = [...groupQuestions];
            shuffle(shuffledQuizData);
            loadQuiz();
        });
});

certificationSelect.addEventListener('change', (event) => {
    const selectedFile = event.target.value;
    const selectedText = event.target.options[event.target.selectedIndex].text;
    const selectedBadge = event.target.options[event.target.selectedIndex].getAttribute('data-badge');
    quizTitle.innerHTML = `Quiz ${selectedText}`;
    certificationBadge.src = selectedBadge;
    currentQuestionIndex = 0;
    numCorrect = 0;
    numIncorrect = 0;
    fetchQuizData(selectedFile);
});

// Gerenciamento de grupos e formulário
let alternativeCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Configurar o gerenciamento do grupo
    const addGroupSelect = document.getElementById('add-group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const newGroupContainer = document.getElementById('new-group-container');

    // Mostrar/esconder input de novo grupo
    addGroupSelect.addEventListener('change', (e) => {
        newGroupContainer.style.display = e.target.value === 'new' ? 'block' : 'none';
    });
});

function createAlternativeInput() {
    const div = document.createElement('div');
    div.className = 'alternative-input';
    div.innerHTML = `
        <input type="text" placeholder="Digite a alternativa..." data-alternative="${alternativeCounter}">
        <button type="button" class="correct-button" data-alternative="${alternativeCounter}">Correta</button>
    `;
    
    const correctButton = div.querySelector('.correct-button');
    correctButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevenir qualquer comportamento padrão
        document.querySelectorAll('.correct-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    });
    
    alternativesContainer.appendChild(div);
    alternativeCounter++;
}

function clearForm() {
    questionText.value = '';
    alternativesContainer.innerHTML = '';
    alternativeCounter = 0;
    // Criar as primeiras 4 alternativas
    for (let i = 0; i < 4; i++) {
        createAlternativeInput();
    }
}

function getFormData() {
    const question = questionText.value.trim();
    const alternatives = {};
    let correct = null;
    
    document.querySelectorAll('.alternative-input').forEach(div => {
        const input = div.querySelector('input');
        const button = div.querySelector('.correct-button');
        const letter = String.fromCharCode(97 + parseInt(input.dataset.alternative)); // a, b, c, d...
        
        alternatives[letter] = input.value.trim();
        if (button.classList.contains('active')) {
            correct = letter;
        }
    });
    
    return { question, ...alternatives, correct };
}

addAlternativeBtn.addEventListener('click', createAlternativeInput);

async function validateAndCreateGroup(currentData) {
    const addGroupSelect = document.getElementById('add-group-select');
    const newGroupInput = document.getElementById('new-group-input');
    
    let selectedGroup = addGroupSelect.value;
    if (selectedGroup === 'new') {
        const newGroupName = newGroupInput.value.trim().toUpperCase();
        if (!newGroupName) {
            throw new Error('Por favor, digite um nome para o novo grupo.');
        }
        
        // Verificar se o grupo já existe
        if (currentData.groups && currentData.groups[newGroupName]) {
            throw new Error(`O grupo ${newGroupName} já existe.`);
        }
        
        // Criar novo grupo
        if (!currentData.groups) {
            currentData.groups = {};
        }
        currentData.groups[newGroupName] = [];
        selectedGroup = newGroupName;
        
        // Atualizar os selects com o novo grupo
        updateGroupSelect(currentData);
        addGroupSelect.value = selectedGroup;
    }
    
    return selectedGroup;
}

function addQuestionToData(formData, currentData) {
    const addGroupSelect = document.getElementById('add-group-select');
    let selectedGroup = addGroupSelect.value;

    // Inicializar estrutura se necessário
    if (!currentData.defaultQuestions) {
        currentData.defaultQuestions = [];
    }
    if (!currentData.groups) {
        currentData.groups = {};
    }

    // Adicionar a pergunta apenas ao grupo selecionado
    if (selectedGroup === 'default') {
        currentData.defaultQuestions.push(formData);
    } else {
        if (!currentData.groups[selectedGroup]) {
            throw new Error('Grupo não encontrado. Por favor, crie o grupo primeiro.');
        }
        currentData.groups[selectedGroup].push(formData);
    }

    return { currentData, selectedGroup };
}

document.getElementById('add-question-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = getFormData();
    
    // Validar dados
    if (!formData.question) {
        alert('Por favor, digite o enunciado da pergunta.');
        return;
    }
    
    if (!formData.a || !formData.b || !formData.c || !formData.d) {
        alert('Por favor, preencha pelo menos 4 alternativas.');
        return;
    }
    
    if (!formData.correct) {
        alert('Por favor, selecione a alternativa correta.');
        return;
    }
    
    try {
        // Carregar dados existentes
        const fileName = document.getElementById('add-certification-select').value;
        let currentData = await loadQuizData(fileName);
        
        // Validar e criar grupo se necessário
        const selectedGroup = await validateAndCreateGroup(currentData);
        
        // Adicionar a pergunta ao grupo apropriado
        const { currentData: updatedData } = addQuestionToData(formData, currentData);
        
        // Salvar dados atualizados e retornar os dados salvos
        const savedData = saveQuizData(fileName, updatedData);
        
        // Limpar formulário
        clearForm();
        document.getElementById('new-group-input').value = '';
        document.getElementById('new-group-container').style.display = 'none';
        document.getElementById('add-group-select').value = selectedGroup;
        
        // Mostrar mensagem de sucesso
        alert('Pergunta adicionada com sucesso ao grupo ' + selectedGroup);

        // Atualizar selects com os novos dados
        updateGroupSelect(savedData);
    } catch (error) {
        alert('Erro ao processar a pergunta: ' + error.message);
    }
});

function exportGroupToJson() {
    const groupSelect = document.getElementById('question-group-select');
    const certSelect = document.getElementById('certification-select');
    const selectedGroup = groupSelect.value;
    const certOption = certSelect.options[certSelect.selectedIndex];
    const certName = certOption.text;
    
    // Carregar os dados atuais
    loadQuizData(certSelect.value)
        .then(data => {
            // Obter as perguntas do grupo selecionado
            const questions = filterQuestionsByGroup(data, selectedGroup);
            
            if (!questions || questions.length === 0) {
                alert('Não há perguntas neste grupo para exportar.');
                return;
            }
            
            // Criar objeto de exportação com metadados
            const exportData = {
                certification: certName,
                groupName: selectedGroup === 'default' ? 'Grupo Padrão' : `Grupo ${selectedGroup}`,
                exportDate: new Date().toISOString(),
                questions: questions
            };
            
            // Converter para JSON
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            
            // Criar link de download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `${certName}_${exportData.groupName}_${timestamp}.json`;
            
            // Trigger do download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            alert('Erro ao exportar o grupo: ' + error.message);
        });
}

// Função para lidar com o arquivo selecionado ou dropado
function handleFile(file) {
    if (!file.type.match('application/json')) {
        jsonFeedback.textContent = 'Por favor, selecione um arquivo JSON válido.';
        jsonFeedback.className = 'error';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonContent = e.target.result;
            jsonInput.value = jsonContent; // Coloca o conteúdo no textarea
            jsonFeedback.textContent = 'Arquivo carregado com sucesso!';
            jsonFeedback.className = 'success';
        } catch (error) {
            jsonFeedback.textContent = 'Erro ao ler o arquivo: ' + error.message;
            jsonFeedback.className = 'error';
        }
    };
    reader.onerror = function() {
        jsonFeedback.textContent = 'Erro ao ler o arquivo!';
        jsonFeedback.className = 'error';
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchQuizData(certificationSelect.value);
    switchTab('quiz'); // Iniciar na aba do quiz
    clearForm(); // Inicializar o formulário com 4 alternativas

    // Configurar drag and drop
    const dropZone = document.getElementById('drag-drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');

    // Eventos de drag e drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // Evento de clique no botão de seleção de arquivo
    selectFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Evento de mudança no input de arquivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });
    
    // Verificar se já existe uma opção "new" selecionada e mostrar o campo se necessário
    const addGroupSelect = document.getElementById('add-group-select');
    const newGroupContainer = document.getElementById('new-group-container');
    if (addGroupSelect.value === 'new') {
        newGroupContainer.style.display = 'block';
    }
    
    // Adicionar evento ao botão de exportação
    document.getElementById('export-group').addEventListener('click', exportGroupToJson);
    
    // Adicionar evento ao botão de importar JSON
    const jsonButton = document.getElementById('add-questions-json');
    if (jsonButton) {
        jsonButton.addEventListener('click', importQuestionsFromJson);
        console.log('Evento de importação JSON registrado');
    } else {
        console.error('Botão de importação JSON não encontrado');
    }
});

function showFinalResults() {
    quiz.innerHTML = '';
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.style.display = 'flex';

    // Mostrar lista de perguntas erradas
    const wrongQuestionsList = document.getElementById('wrong-questions-list');
    wrongQuestionsList.innerHTML = wrongQuestions.length > 0 
        ? wrongQuestions.map((q, index) => `
            <div class="wrong-question-item">
                <p><strong>Pergunta ${index + 1}:</strong> ${q.question}</p>
                <p>Sua resposta: ${q.userAnswer}</p>
                <p class="correct-answer">Resposta correta: ${q.correctAnswer}</p>
            </div>
        `).join('')
        : '<p>Parabéns! Você não errou nenhuma pergunta!</p>';

    // Criar gráfico de pizza
    const ctx = document.getElementById('results-chart').getContext('2d');
    
    if (window.resultsChart) {
        window.resultsChart.destroy();
    }
    
    window.resultsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Acertos', 'Erros'],
            datasets: [{
                data: [numCorrect, numIncorrect],
                backgroundColor: ['#4CAF50', '#d32f2f'],
                borderColor: ['#388E3C', '#b71c1c'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: `Resultado Final: ${numCorrect} de ${shuffledQuizData.length} corretas`,
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

submitBtn.addEventListener('click', showResults);

// Reset wrongQuestions array when starting new quiz
document.getElementById('question-group-select').addEventListener('change', () => {
    wrongQuestions = [];
    // Esconder o container de resultados quando mudar de grupo
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.style.display = 'none';
    currentQuestionIndex = 0;
    numCorrect = 0;
    numIncorrect = 0;
});

certificationSelect.addEventListener('change', () => {
    wrongQuestions = [];
    // Esconder o container de resultados quando mudar de certificação
    const resultsContainer = document.querySelector('.results-container');
    resultsContainer.style.display = 'none';
});

// Aba e navegação