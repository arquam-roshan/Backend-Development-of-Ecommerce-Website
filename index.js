import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import pg from "pg";
import env from "dotenv";
// Initialize the JS client
import { createClient } from '@supabase/supabase-js';

env.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const app = express();
const port = 3000;


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true
    })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// const db = new pg.Client({
//     user: process.env.PG_USER,
//     host: process.env.PG_HOST,
//     database: process.env.PG_DATABASE,
//     password: process.env.PG_PASS,
//     port: process.env.PG_PORT
// });
// db.connect();

let products = [];

async function getFeatured() {
    const { data, error } = await supabase.from('product').select('id, image, name, price, brand(name)').like('image', '%f%.jpg');
    return data;
}
async function getNewProduct() {
    const { data, error } = await supabase.from('product').select('id, image, name, price, brand(name)').like('image', '%n%.jpg');
    return data;
}

app.get("/", async (req, res) => {
    let fproducts = [];
    let nproducts = [];

    // const { data, error } = await supabase.from('product').select('id, image, name, price, brand(name)').like('image', '%f%.jpg');

    const featured = await getFeatured();

    console.log(featured);

    // const fresult = await db.query("SELECT product.id as product_id, image, brand.name as brand_name, product.name as product_name, price FROM product JOIN brand ON product.brand_id = brand.id WHERE image LIKE '%f%' || '%.jpg';");
    featured.forEach(product => {
        fproducts.push(product);
    });

    // const nresult = await db.query("SELECT product.id as product_id, image, brand.name as brand_name, product.name as product_name, price FROM product JOIN brand ON product.brand_id = brand.id WHERE image LIKE '%n%' || '%.jpg';")
    const newProduct = await getNewProduct();
    newProduct.forEach(product => {
        nproducts.push(product);
    });

    res.render("index.ejs", {
        active: "index",
        fproducts: fproducts,
        nproducts: nproducts
    });
});

app.get("/shop", async (req, res) => {

    products = [];

    // const result = await db.query("SELECT product.id as product_id, image, brand.name as brand_name, product.name as product_name, price FROM product JOIN brand ON brand.id = product.brand_id;");
    const { data, error } = await supabase.from('product').select('id, image, name, price, brand(name)');
    data.forEach(product => {
        products.push(product);
    });

    res.render("shop.ejs", { active: "shop", products: products });
});

app.get("/sproduct/:productId", async (req, res) => {

    const productId = req.params.productId;

    // const result = await db.query("SELECT * FROM product WHERE id = $1", [productId],);
    const { data, error } = await supabase.from('product').select('*').eq('id', productId);
    req.session.products = data;

    res.redirect("/sproduct");
});

app.get("/sproduct", (req, res) => {

    // if there is no selected product in the current session, user redirected to shop
    if (!req.session.products) {
        req.session.products = {};
        res.redirect("/shop");
        return;
    }
    const product = req.session.products;
    console.log(product[0]);

    res.render("sproduct.ejs", { active: "shop", product: product[0] });
});

app.get("/cart", (req, res) => {
    // console.log(req.session.cart);
    res.render("cart.ejs", { active: 'cart', products: req.session.cart });
});

app.get("/about", (req, res) => {
    res.render("about.ejs", { active: 'about' });
});

app.get("/contact", (req, res) => {
    res.render("contact.ejs", { active: 'contact' });
});

app.get("/remove", (req, res) => {
    const id = req.query.id;

    if (req.session.cart) {
        for (let i = 0; i < req.session.cart.length; i++) {
            if (id == req.session.cart[i].product_id) {
                req.session.cart.splice(i, 1);
            }
        }
    }

    res.redirect("/cart");

    // console.log(id);
});


app.post("/addtocart", async (req, res) => {
    const id = req.body.product_id;
    // get brand name of the product
    // const result = await db.query("SELECT name FROM brand WHERE id = $1", [req.body.brand_id]);
    const { data, error } = await supabase.from('brand').select('name').eq('id', req.body.brand_id);
    const brandName = data.name;
    const productName = req.body.product_name;
    const name = brandName + " " + productName;
    const price = parseFloat(req.body.price);
    const image = req.body.image;
    const quantity = parseInt(req.body.quantity);

    let count = 0;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    for (let i = 0; i < req.session.cart.length; i++) {
        if (req.session.cart[i].product_id == id) {
            req.session.cart[i].quantity += quantity;
            count++
        }
    }

    if (count === 0) {
        const cart_data = {
            product_id: id,
            product_name: name,
            product_price: price,
            quantity: quantity,
            image: image
        };

        req.session.cart.push(cart_data);
    }

    res.redirect("/shop");
});


app.listen(() => {
    console.log(`Server is running`);
});
