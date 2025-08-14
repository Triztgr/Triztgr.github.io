const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicialização do Express
const app = express();
const PORT = 3000;

// Middleware para processar JSON e habilitar CORS
app.use(express.json());
app.use(cors());

// Variável para armazenar o carrinho
let cart = { items: [] };

// Tenta inicializar o Firebase Admin SDK com a chave de conta de serviço
let serviceAccount;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK inicializado com sucesso.');
  } else {
    console.error('ERRO: O arquivo serviceAccountKey.json não foi encontrado.');
    console.error('O backend não poderá se conectar ao Firestore.');
    // Se o arquivo não existe, a aplicação continuará, mas sem o Firestore
  }
} catch (error) {
  console.error('Erro ao inicializar o Firebase Admin SDK:', error);
}

// Inicializa o Firestore se o SDK foi inicializado
const db = admin.firestore ? admin.firestore() : null;
let productsCollectionRef = null;
if (db) {
  productsCollectionRef = db.collection('products');
}

/**
 * Endpoint para obter todos os produtos.
 */
app.get('/api/products', async (req, res) => {
  if (!productsCollectionRef) {
    return res.status(500).json({ error: 'Firestore não está configurado.' });
  }

  try {
    const snapshot = await productsCollectionRef.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    console.error("Erro ao obter produtos: ", error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Endpoint para adicionar um novo produto.
 */
app.post('/api/products', async (req, res) => {
  if (!productsCollectionRef) {
    return res.status(500).json({ error: 'Firestore não está configurado.' });
  }

  const { name, price, image } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
  }

  const newProduct = {
    name,
    price: parseFloat(price),
    image: image || 'https://placehold.co/600x400/E5E7EB/4B5563?text=Novo+Produto',
    createdAt: admin.firestore.FieldValue.serverTimestamp() // Adiciona um timestamp
  };

  try {
    const docRef = await productsCollectionRef.add(newProduct);
    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (error) {
    console.error("Erro ao adicionar produto: ", error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/**
 * Endpoint para obter os itens do carrinho.
 */
app.get('/api/cart', (req, res) => {
  res.json(cart);
});

/**
 * Endpoint para atualizar o carrinho.
 */
app.post('/api/cart', (req, res) => {
  // Apenas aceita o objeto de carrinho completo
  const newCart = req.body;
  if (newCart && newCart.items) {
    cart = newCart;
    res.status(200).json({ message: 'Carrinho atualizado com sucesso.' });
  } else {
    res.status(400).json({ error: 'Formato do carrinho inválido.' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
