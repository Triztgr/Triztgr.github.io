// server.js - Backend para a loja Artefatos Geek

// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializa o Express
const app = express();
const port = 3000;

// Middleware para permitir requisições de diferentes origens (importante para o frontend)
app.use(cors());
// Middleware para processar JSON nas requisições
app.use(express.json());

// --- Configuração do Firebase Admin e Firestore ---
// As variáveis globais __app_id e __firebase_config são fornecidas pelo ambiente
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Verifica se a configuração do Firebase é válida
if (!firebaseConfig.privateKey) {
  console.error("Firebase Admin SDK credentials are not configured. The backend will not be able to connect to Firestore.");
  // Em um ambiente de produção real, você encerraria a aplicação aqui.
} else {
  // Inicializa o Firebase Admin SDK
  initializeApp({
    credential: cert(firebaseConfig)
  });

  // Obtém uma instância do Firestore
  const db = getFirestore();

  // Define o caminho da coleção para os produtos e o carrinho
  // Usamos o __app_id para garantir que os dados sejam isolados para esta aplicação
  const productsCollectionPath = `/artifacts/${appId}/public/data/products`;
  const cartCollectionPath = `/artifacts/${appId}/public/data/cart`;

  // --- Rotas da API ---

  // Rota para obter todos os produtos
  // Exemplo de uso no frontend: fetch('/api/products')
  app.get('/api/products', async (req, res) => {
    try {
      const productsRef = db.collection(productsCollectionPath);
      const snapshot = await productsRef.get();
      
      if (snapshot.empty) {
        console.log('Nenhum produto encontrado.');
        return res.status(404).json({ message: 'Nenhum produto encontrado.' });
      }

      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });

      res.status(200).json(products);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  });

  // Rota para adicionar um novo produto (exemplo, para popular o banco de dados)
  // Exemplo de uso: POST para '/api/products' com um JSON do produto no corpo
  app.post('/api/products', async (req, res) => {
    try {
      const productData = req.body;
      const productsRef = db.collection(productsCollectionPath);
      const newProductRef = await productsRef.add(productData);
      res.status(201).json({ id: newProductRef.id, ...productData });
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  });

  // Rota para obter o carrinho (neste exemplo, um único carrinho para todos os usuários)
  app.get('/api/cart', async (req, res) => {
    try {
      // Como não temos autenticação, usamos um ID de carrinho estático para demonstração
      const cartDocRef = db.collection(cartCollectionPath).doc('userCart');
      const doc = await cartDocRef.get();
      
      if (!doc.exists) {
        return res.status(200).json({ items: [] });
      }

      res.status(200).json(doc.data());
    } catch (error) {
      console.error('Erro ao buscar o carrinho:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  });

  // Rota para atualizar o carrinho
  app.post('/api/cart', async (req, res) => {
    try {
      const { items } = req.body;
      // Atualiza o documento do carrinho com os novos itens
      const cartDocRef = db.collection(cartCollectionPath).doc('userCart');
      await cartDocRef.set({ items });
      res.status(200).json({ message: 'Carrinho atualizado com sucesso.' });
    } catch (error) {
      console.error('Erro ao atualizar o carrinho:', error);
      res.status(500).json({ message: 'Erro interno do servidor.' });
    }
  });
}

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
