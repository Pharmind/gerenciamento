// Importando Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDId1zwk4vCgun6n8fNJS8r1WYddsafV4Q",
  authDomain: "gerenciamentofarmaceutico.firebaseapp.com",
  projectId: "gerenciamentofarmaceutico",
  storageBucket: "gerenciamentofarmaceutico.firebasestorage.app",
  messagingSenderId: "154956076146",
  appId: "1:154956076146:web:a7616c1b86e6d97cb1deeb",
  measurementId: "G-HVMSMNLSSL"
};

// Inicializando Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para carregar o inventário do Firestore
async function loadInventoryFromFirestore() {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    inventory = [];
    querySnapshot.forEach((doc) => {
        inventory.push({ id: doc.id, ...doc.data() });
    });
    updateInventoryTable();
    updateDashboard();
}

// Função para salvar item no Firestore
async function saveItemToFirestore(item) {
    try {
        await addDoc(collection(db, "inventory"), item);
        console.log("Item salvo no Firebase:", item);
        loadInventoryFromFirestore();
    } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
    }
}

// Função para atualizar um item no Firestore
async function updateItemInFirestore(id, updatedItem) {
    try {
        const itemRef = doc(db, "inventory", id);
        await updateDoc(itemRef, updatedItem);
        console.log("Item atualizado no Firestore:", updatedItem);
        loadInventoryFromFirestore();
    } catch (error) {
        console.error("Erro ao atualizar item:", error);
    }
}

// Função para excluir um item do Firestore
async function deleteItemFromFirestore(id) {
    try {
        await deleteDoc(doc(db, "inventory", id));
        console.log("Item excluído do Firestore:", id);
        loadInventoryFromFirestore();
    } catch (error) {
        console.error("Erro ao excluir item:", error);
    }
}

// Atualizando o carregamento inicial para buscar do Firestore
document.addEventListener('DOMContentLoaded', () => {
    loadInventoryFromFirestore();
    setupEventListeners();
});

// Ajustando a função de envio do formulário para usar Firestore
async function handleItemFormSubmit(e) {
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
    
    if (!code || !name || !category || !unit || isNaN(stock) || isNaN(minStock) || isNaN(dailyConsumption) || isNaN(price)) {
        showModal('Erro', 'Por favor, preencha todos os campos obrigatórios.');
        return;
    }
    
    const existingItem = inventory.find(item => item.code === code);
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
    
    if (existingItem) {
        await updateItemInFirestore(existingItem.id, newItem);
    } else {
        await saveItemToFirestore(newItem);
    }
    clearItemForm();
}

// Ajustando a função de exclusão
document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("btn-delete")) {
        const code = event.target.getAttribute("data-code");
        const itemToDelete = inventory.find(i => i.code === code);
        if (itemToDelete && confirm(`Tem certeza que deseja excluir o item ${code} - ${itemToDelete.name}?`)) {
            await deleteItemFromFirestore(itemToDelete.id);
        }
    }
});
