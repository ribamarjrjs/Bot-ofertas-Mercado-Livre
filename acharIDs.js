const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("Iniciando busca por IDs de grupo...");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on("qr", (qr) => {
    console.log("Escaneie o QR Code para conectar:");
    qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
    console.log("✅ WhatsApp Conectado!");
    console.log("\nBuscando seus grupos... Por favor, aguarde.");

    try {
        const chats = await client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);

        if (grupos.length === 0) {
            console.log("Nenhum grupo encontrado.");
        } else {
            console.log("\n--- SEUS GRUPOS E IDs ---");
            grupos.forEach(grupo => {
                console.log(`Nome: ${grupo.name}`);
                console.log(`ID: ${grupo.id._serialized}`);
                console.log("-------------------------");
            });
        }
    } catch (e) {
        console.error("Erro ao buscar chats:", e);
    }

    console.log("\nPronto! Copie o ID do grupo desejado e cole no seu bot principal.");
    await client.destroy(); // Desconecta e fecha
    process.exit(0); // Finaliza o script
});

client.initialize();