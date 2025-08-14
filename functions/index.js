// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

// Inicializa o Firestore
const db = admin.firestore();
const productsCollectionRef = db.collection("products");
const cartCollectionRef = db.collection("cart");

const app = express();

app.use(cors({origin: true}));
app.use(express.json());


app.get("/products", async (req, res) => {
  try {
    const snapshot = await productsCollectionRef.get();
    const products = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(products);
  } catch (error) {
    console.error("Erro ao obter produtos: ", error);
    res.status(500).json({error: "Erro interno do servidor."});
  }
});

app.post("/products", async (req, res) => {
  const {name, price, image} = req.body;
  if (!name || !price) {
    return res.status(400).json({error: "Nome e preço são obrigatórios."});
  }

  const newProduct = {
    name,
    price: parseFloat(price),
    image: image || "https://placehold.co/600x400/E5E7EB/4B5563?text=Novo+Produto",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const docRef = await productsCollectionRef.add(newProduct);
    res.status(201).json({id: docRef.id, ...newProduct});
  } catch (error) {
    console.error("Erro ao adicionar produto: ", error);
    res.status(500).json({error: "Erro interno do servidor."});
  }
});

/**

 */
app.get("/cart/:cartId", async (req, res) => {
  const cartId = req.params.cartId;
  try {
    const doc = await cartCollectionRef.doc(cartId).get();
    if (!doc.exists) {
      return res.json({items: []});
    }
    res.json(doc.data());
  } catch (error) {
    console.error("Erro ao obter o carrinho: ", error);
    res.status(500).json({error: "Erro interno do servidor."});
  }
});

/**
 * Endpoint para atualizar o carrinho.
 */
app.post("/cart/:cartId", async (req, res) => {
  const cartId = req.params.cartId;
  const newCart = req.body;
  if (newCart && newCart.items) {
    try {
      await cartCollectionRef.doc(cartId).set(newCart, {merge: true});
      res.status(200).json({message: "Carrinho atualizado com sucesso."});
    } catch (error) {
      console.error("Erro ao atualizar o carrinho: ", error);
      res.status(500).json({error: "Erro interno do servidor."});
    }
  } else {
    res.status(400).json({error: "Formato do carrinho inválido."});
  }
});

// Exporta o aplicativo Express como uma função HTTP do Firebase
exports.app = functions.https.onRequest(app);
