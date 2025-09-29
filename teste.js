const puppeteer = require("puppeteer");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

console.log("🚀 INICIANDO BOT DE OFERTAS COM MERCADO LIVRE...");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const GROUP_NAME = "Diário JR EFOOTBALL MOBILE";

// ==========================================================
// AQUI: Altere este número para a quantidade de ofertas que você deseja
const NUMERO_DE_OFERTAS = 10; 
// ==========================================================


// Funções da Etapa 1
async function buscarOfertasReais() {
    console.log("🔍 Etapa 1: Buscando links de ofertas na página principal...");
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        await page.goto('https://www.mercadolivre.com.br/ofertas?container_id=MLB1298579-1&deal_ids=MLB1298579#filter_applied=container_id&filter_position=3&is_recommended_domain=false&origin=scut', { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // A variável NUMERO_DE_OFERTAS é passada para a função do navegador
        const ofertas = await page.evaluate((limite) => {
            const items = [];
            const titulosVistos = new Set();
            const elementos = document.querySelectorAll('[class*="card"], [class*="item"], [class*="product"]');
            for (let elemento of elementos) {
                try {
                    let titulo = '';
                    const titulos = elemento.querySelectorAll('h2, h3, [class*="title"], [class*="name"]');
                    for (let tituloEl of titulos) {
                        if (tituloEl.textContent && tituloEl.textContent.trim().length > 10) {
                            titulo = tituloEl.textContent.trim();
                            break;
                        }
                    }
                    let precoFinal = '';
                    const priceFractionEl = elemento.querySelector('.andes-money-amount__fraction');
                    const priceCentsEl = elemento.querySelector('.andes-money-amount__cents');
                    if (priceFractionEl) {
                        const precoInteiro = priceFractionEl.textContent.trim().replace(/\./g, '');
                        const precoCentavos = priceCentsEl ? priceCentsEl.textContent.trim() : '00';
                        precoFinal = `R$ ${precoInteiro},${precoCentavos}`;
                    }
                    let link = '';
                    const linkEl = elemento.querySelector('a');
                    if (linkEl && linkEl.href && linkEl.href.includes('mercadolivre')) {
                        link = linkEl.href;
                    }
                    let imagem = '';
                    const imgEl = elemento.querySelector('img');
                    if (imgEl) {
                        imagem = imgEl.dataset.src || imgEl.src;
                    }
                    if (titulo && precoFinal && link && !titulosVistos.has(titulo)) {
                        if (!titulo.toLowerCase().includes('frete') && titulo.length > 15) {
                            titulosVistos.add(titulo);
                            items.push({ titulo: titulo.substring(0, 100), preco: precoFinal, link: link, imagem: imagem });
                            // AQUI: o limite da busca agora usa a variável
                            if (items.length >= limite) break;
                        }
                    }
                } catch (error) {}
            }
            return items;
        }, NUMERO_DE_OFERTAS); // Passando a variável para a função

        await browser.close();
        console.log(`✅ Links encontrados: ${ofertas.length}`);
        return ofertas;
    } catch (error) {
        console.log('❌ Erro na Etapa 1 (buscarOfertasReais):', error.message);
        if (browser) await browser.close();
        return [];
    }
}
async function buscarMaisOfertas() {
    console.log("🔄 Etapa 1: Buscando mais links em outra categoria...");
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto('https://www.mercadolivre.com.br/eletronicos-antigos#deal_print_id=db7d7b80-7b8d-11ee-b362-b3a97386c915', { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 4000));
        const ofertas = await page.evaluate(() => {
            const items = [];
            const titulosVistos = new Set();
            const produtos = document.querySelectorAll('.ui-search-layout__item');
            for (let produto of produtos) {
                try {
                    const tituloEl = produto.querySelector('.ui-search-item__title');
                    const linkEl = produto.querySelector('a.ui-search-link');
                    const imgEl = produto.querySelector('img.ui-search-result-image__element');
                    let precoFinal = '';
                    const priceFractionEl = produto.querySelector('.andes-money-amount__fraction');
                    const priceCentsEl = produto.querySelector('.andes-money-amount__cents');
                    if (priceFractionEl) {
                        const precoInteiro = priceFractionEl.textContent.trim().replace(/\./g, '');
                        const precoCentavos = priceCentsEl ? priceCentsEl.textContent.trim() : '00';
                        precoFinal = `R$ ${precoInteiro},${precoCentavos}`;
                    }
                    const titulo = tituloEl?.textContent?.trim();
                    const link = linkEl?.href;
                    const imagem = imgEl?.dataset.src || imgEl?.src;
                    if (titulo && precoFinal && link && !titulosVistos.has(titulo)) {
                        if (!titulo.toLowerCase().includes('frete') && titulo.length > 15) {
                            titulosVistos.add(titulo);
                            items.push({ titulo: titulo.substring(0, 100), preco: precoFinal, link: link, imagem: imagem || '' });
                            // Pode ajustar este limite se quiser, ele é só um fallback
                            if (items.length >= 5) break; 
                        }
                    }
                } catch (e) {}
            }
            return items;
        });
        await browser.close();
        return ofertas;
    } catch (error) {
        console.log('❌ Erro na Etapa 1 (buscarMaisOfertas):', error.message);
        if (browser) await browser.close();
        return [];
    }
}

// Função da Etapa 2
async function verificarPrecoRealNaPagina(url, browser) {
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
        const precoReal = await page.evaluate(() => {
            let containerPreco = null;
            containerPreco = document.querySelector('.ui-pdp-price__first-line .andes-money-amount');
            if (!containerPreco) {
                const todosOsPrecos = document.querySelectorAll('.andes-money-amount');
                for (const precoEl of todosOsPrecos) {
                    if (!precoEl.closest('s')) {
                        containerPreco = precoEl;
                        break;
                    }
                }
            }
            if (containerPreco) {
                const fracaoEl = containerPreco.querySelector('.andes-money-amount__fraction');
                const centavosEl = containerPreco.querySelector('.andes-money-amount__cents');
                const fracao = fracaoEl ? fracaoEl.innerText.trim() : '0';
                const centavos = centavosEl ? centavosEl.innerText.trim() : '00';
                return `R$ ${fracao},${centavos}`;
            }
            return null;
        });
        await page.close();
        return precoReal;
    } catch (error) {
        console.log(`   ⚠️ Não foi possível verificar o preço para ${url}. Motivo: ${error.message}`);
        return null;
    }
}


client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("authenticated", () => console.log("🔐 AUTENTICADO NO WHATSAPP!"));
client.on("auth_failure", (msg) => console.log("❌ FALHA NA AUTENTICAÇÃO:", msg));
client.on("disconnected", (reason) => console.log("🔌 DESCONECTADO:", reason));

client.on("ready", async () => {
    console.log("✅ WHATSAPP CONECTADO COM SUCESSO!");
    let browserParaVerificacao;
    try {
        const chats = await client.getChats();
        const grupo = chats.find(chat => chat.name === GROUP_NAME);
        if (!grupo) {
            console.log("❌ Grupo não encontrado!");
            return;
        }
        console.log(`✅ Grupo encontrado: ${grupo.name}`);

        let ofertasIniciais = await buscarOfertasReais();
        if (ofertasIniciais.length < 3) {
            const ofertasAdicionais = await buscarMaisOfertas();
            // AQUI: o limite final agora usa a variável
            ofertasIniciais = [...ofertasIniciais, ...ofertasAdicionais].slice(0, NUMERO_DE_OFERTAS);
        }

        if (ofertasIniciais.length === 0) {
             console.log("🤷 Nenhuma oferta encontrada na Etapa 1.");
             return;
        }

        console.log("\n🔍 Etapa 2: Verificando os preços reais em cada página de produto...");
        browserParaVerificacao = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        const ofertasVerificadas = [];
        for (const oferta of ofertasIniciais) {
            console.log(`   🔎 Verificando: ${oferta.titulo}`);
            const precoCorreto = await verificarPrecoRealNaPagina(oferta.link, browserParaVerificacao);
            if (precoCorreto) {
                oferta.preco = precoCorreto;
                ofertasVerificadas.push(oferta);
            } else {
                console.log(`   ⚠️ Mantendo preço original para: ${oferta.titulo}`);
                ofertasVerificadas.push(oferta);
            }
            await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
        await browserParaVerificacao.close();
        console.log("✅ Verificação de preços concluída!");
        
        const ofertasParaEnviar = ofertasVerificadas.length > 0 ? ofertasVerificadas : [];
        if (ofertasParaEnviar.length === 0) return;

        console.log(`\n📤 Preparando para enviar ${ofertasParaEnviar.length} ofertas com preços verificados...`);
        for (const oferta of ofertasParaEnviar) {
            try {
                const mensagem = `🔥 *${oferta.titulo}*\n💰 Preço: ${oferta.preco}\n🔗 ${oferta.link}`;
                console.log(`   ⏳ Enviando: ${oferta.titulo} - ${oferta.preco}`);
                if (oferta.imagem && oferta.imagem.startsWith('http')) {
                    const media = await MessageMedia.fromUrl(oferta.imagem, { unsafeMime: true, timeout: 10000 });
                    await client.sendMessage(grupo.id._serialized, media, { caption: mensagem });
                } else {
                    await client.sendMessage(grupo.id._serialized, mensagem);
                }
                console.log(`   ✅ Enviado!`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.log(`❌ Erro ao enviar oferta: ${error.message}`);
            }
        }
        console.log("🎉 PROCESSO CONCLUÍDO!");

    } catch (error) {
        console.log("❌ ERRO CRÍTICO:", error.message);
        if (browserParaVerificacao) await browserParaVerificacao.close();
    }
});

console.log("⏳ Inicializando WhatsApp Web...");
client.initialize();