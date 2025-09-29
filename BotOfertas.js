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

const GROUP_NAME = "";
const GROUP_ID = process.env.WHATSAPP_GROUP_ID || "120363405725784343@g.us,120363405868385127@g.us"; // compat: único
// Suporte a múltiplos grupos via variáveis separadas por vírgula
const GROUP_IDS = (process.env.WHATSAPP_GROUP_IDS || GROUP_ID)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const GROUP_NAMES = (process.env.WHATSAPP_GROUP_NAMES || GROUP_NAME)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// ==========================================================
// AQUI: Altere este número para a quantidade de ofertas que você deseja
const NUMERO_DE_OFERTAS = 5; 
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
        await page.goto('https://www.mercadolivre.com.br/ofertas?container_id=MLB779535-1&domain_id=MLB-CELLPHONES#filter_applied=domain_id&filter_position=6&is_recommended_domain=false&origin=scut', { waitUntil: 'networkidle2', timeout: 30000 });
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
                    // precoPor (atual) e precoDe (riscado)
                    let precoPor = '';
                    let precoDe = '';
                    const priceContainerPor = elemento.querySelector('.andes-money-amount:not(s .andes-money-amount)');
                    const priceFractionEl = (priceContainerPor || elemento).querySelector('.andes-money-amount__fraction');
                    const priceCentsEl = (priceContainerPor || elemento).querySelector('.andes-money-amount__cents');
                    if (priceFractionEl) {
                        const precoInteiro = priceFractionEl.textContent.trim().replace(/\./g, '');
                        const precoCentavos = priceCentsEl ? priceCentsEl.textContent.trim() : '00';
                        precoPor = `R$ ${precoInteiro},${precoCentavos}`;
                    }
                    const candidatoDe = elemento.querySelector('s .andes-money-amount')
                        || elemento.querySelector('.andes-money-amount--previous')
                        || elemento.querySelector('[class*="previous"] .andes-money-amount');
                    if (candidatoDe) {
                        const fracDe = candidatoDe.querySelector('.andes-money-amount__fraction');
                        const centsDe = candidatoDe.querySelector('.andes-money-amount__cents');
                        const fr = fracDe ? fracDe.textContent.trim().replace(/\./g, '') : '';
                        const ce = centsDe ? centsDe.textContent.trim() : '00';
                        if (fr) precoDe = `R$ ${fr},${ce}`;
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
                    if (titulo && precoPor && link && !titulosVistos.has(titulo)) {
                        if (!titulo.toLowerCase().includes('frete') && titulo.length > 15) {
                            titulosVistos.add(titulo);
                            items.push({ titulo: titulo.substring(0, 100), precoPor: precoPor, precoDe: precoDe, link: link, imagem: imagem });
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
                    // precoPor e precoDe
                    let precoPor = '';
                    let precoDe = '';
                    const priceContainerPor = produto.querySelector('.andes-money-amount:not(s .andes-money-amount)');
                    const priceFractionEl = (priceContainerPor || produto).querySelector('.andes-money-amount__fraction');
                    const priceCentsEl = (priceContainerPor || produto).querySelector('.andes-money-amount__cents');
                    if (priceFractionEl) {
                        const precoInteiro = priceFractionEl.textContent.trim().replace(/\./g, '');
                        const precoCentavos = priceCentsEl ? priceCentsEl.textContent.trim() : '00';
                        precoPor = `R$ ${precoInteiro},${precoCentavos}`;
                    }
                    const candidatoDe = produto.querySelector('s .andes-money-amount')
                        || produto.querySelector('.andes-money-amount--previous')
                        || produto.querySelector('[class*="previous"] .andes-money-amount');
                    if (candidatoDe) {
                        const fracDe = candidatoDe.querySelector('.andes-money-amount__fraction');
                        const centsDe = candidatoDe.querySelector('.andes-money-amount__cents');
                        const fr = fracDe ? fracDe.textContent.trim().replace(/\./g, '') : '';
                        const ce = centsDe ? centsDe.textContent.trim() : '00';
                        if (fr) precoDe = `R$ ${fr},${ce}`;
                    }
                    const titulo = tituloEl?.textContent?.trim();
                    const link = linkEl?.href;
                    const imagem = imgEl?.dataset.src || imgEl?.src;
                    if (titulo && precoPor && link && !titulosVistos.has(titulo)) {
                        if (!titulo.toLowerCase().includes('frete') && titulo.length > 15) {
                            titulosVistos.add(titulo);
                            items.push({ titulo: titulo.substring(0, 100), precoPor: precoPor, precoDe: precoDe, link: link, imagem: imagem || '' });
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
            // precoPor: preço atual (não riscado)
            let containerPor = document.querySelector('.ui-pdp-price__first-line .andes-money-amount');
            if (!containerPor) {
                const todos = Array.from(document.querySelectorAll('.andes-money-amount'));
                containerPor = todos.find(el => !el.closest('s')) || null;
            }
            let precoPor = null;
            if (containerPor) {
                const fracaoEl = containerPor.querySelector('.andes-money-amount__fraction');
                const centavosEl = containerPor.querySelector('.andes-money-amount__cents');
                const fracao = fracaoEl ? fracaoEl.innerText.trim() : '0';
                const centavos = centavosEl ? centavosEl.innerText.trim() : '00';
                precoPor = `R$ ${fracao},${centavos}`;
            }
            // precoDe: preço anterior, riscado
            let precoDe = null;
            const candidatoDe = document.querySelector('s .andes-money-amount')
                || document.querySelector('.andes-money-amount--previous')
                || document.querySelector('[class*="previous"] .andes-money-amount')
                || Array.from(document.querySelectorAll('.andes-money-amount')).find(el => (el.closest('s') || /previous/.test(el.className)));
            if (candidatoDe) {
                const fracaoEl = candidatoDe.querySelector('.andes-money-amount__fraction');
                const centavosEl = candidatoDe.querySelector('.andes-money-amount__cents');
                const fracao = fracaoEl ? fracaoEl.innerText.trim() : '';
                const centavos = centavosEl ? centavosEl.innerText.trim() : '00';
                if (fracao) precoDe = `R$ ${fracao},${centavos}`;
            }
            return { precoPor, precoDe };
        });
        await page.close();
        return precoReal;
    } catch (error) {
        console.log(`   ⚠️ Não foi possível verificar o preço para ${url}. Motivo: ${error.message}`);
        return null;
    }
}


// ================= Afiliados: LinkBuilder ==================
const LINKBUILDER_URL = 'https://www.mercadolivre.com.br/afiliados/linkbuilder#hub';
let browserAfiliadosCompartilhado = null;
let linkBuilderPage = null; // manter a aba do LinkBuilder aberta e no topo

async function obterBrowserAfiliados() {
    if (browserAfiliadosCompartilhado) return browserAfiliadosCompartilhado;
    browserAfiliadosCompartilhado = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: './.ml-afiliados-sessao'
    });
    return browserAfiliadosCompartilhado;
}

async function gerarLinkAfiliado(urlProduto) {
    try {
        if (/meli\.link|mercadolivre\.com\/sec\//.test(urlProduto)) {
            return urlProduto;
        }
        const browser = await obterBrowserAfiliados();
        if (!linkBuilderPage || linkBuilderPage.isClosed?.()) {
            linkBuilderPage = await browser.newPage();
        }
        const page = linkBuilderPage;
        await page.bringToFront();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        if (!/afiliados\/linkbuilder/.test(page.url() || '')) {
            await page.goto(LINKBUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        if (/mercadolivre\.com\.br\/ajuda|mercadolivre\.com\.br\/login|mercadopago\.com/.test(page.url())) {
            console.log('🔐 Faça login no Afiliados na janela aberta. Vou aguardar você concluir...');
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 180000 });
            } catch {}
            if (!/afiliados\/linkbuilder/.test(page.url())) {
                await page.goto(LINKBUILDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
            }
        } else {
            await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 }).catch(() => {});
        }

        try {
            await page.evaluate(() => {
                const textos = ['Aceitar', 'Aceitar cookies', 'Permitir todos'];
                const bts = Array.from(document.querySelectorAll('button'));
                const bt = bts.find(e => textos.some(t => (e.textContent || '').trim().includes(t)));
                if (bt) bt.click();
            });
        } catch {}

        await page.evaluate(() => {
            const body = document.querySelector('body');
            if (body) body.click();
        });

        let campo = await page.waitForSelector('input[type="url"], input[placeholder*="http" i], input[placeholder*="link" i], textarea', { timeout: 15000 }).catch(() => null);
        if (!campo) {
            const inputs = await page.$$('input, textarea');
            if (inputs.length > 0) campo = inputs[0];
        }
        if (!campo) throw new Error('Campo de URL não encontrado');
        await campo.click({ clickCount: 3 }).catch(() => {});
        await page.keyboard.type(urlProduto);
        await new Promise(resolve => setTimeout(resolve, 300));

        let clicado = false;
        try {
            const botaoGerar = await page.evaluateHandle(() => {
                const bts = Array.from(document.querySelectorAll('button, a'));
                const alvo = bts.find(b => /gerar link|gerar|encurtar|criar link|shorten|create/i.test((b.textContent || '').toLowerCase()));
                return alvo || null;
            });
            if (botaoGerar) {
                await botaoGerar.asElement().click();
                clicado = true;
            }
        } catch {}
        if (!clicado) {
            await page.keyboard.press('Enter').catch(() => {});
        }

        const linkCurto = await page.waitForFunction(() => {
            const regex = /(https?:\/\/\S*(meli\.link|mercadolivre\.com\/sec\/)[^\s]*)/i;
            const candidatos = Array.from(document.querySelectorAll('input, textarea, a, div, span'));
            for (const el of candidatos) {
                const val = (el.value || el.href || el.textContent || '').trim();
                if (regex.test(val)) {
                    const m = val.match(regex);
                    return m ? m[1] : null;
                }
            }
            return null;
        }, { timeout: 30000 });

        const urlCurta = await linkCurto.jsonValue();
        await page.bringToFront();
        return urlCurta || urlProduto;
    } catch (e) {
        console.log('⚠️ Falha ao gerar link de afiliado, usando URL original. Motivo:', e.message);
        return urlProduto;
    }
}

process.on('exit', async () => {
    try { /* keep session */ } catch {}
});
// ===========================================================

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("authenticated", () => console.log("🔐 AUTENTICADO NO WHATSAPP!"));
client.on("auth_failure", (msg) => console.log("❌ FALHA NA AUTENTICAÇÃO:", msg));
client.on("disconnected", (reason) => console.log("🔌 DESCONECTADO:", reason));

client.on("ready", async () => {
    console.log("✅ WHATSAPP CONECTADO COM SUCESSO!");
    const rodar = async () => {
        let browserParaVerificacao;
        try {
            const chats = await client.getChats();
            const encontradosPorId = chats.filter(c => GROUP_IDS.includes(c.id?._serialized));
            const encontradosPorNome = chats.filter(c => GROUP_NAMES.includes(c.name));
            const mapa = new Map();
            for (const g of [...encontradosPorId, ...encontradosPorNome]) {
                mapa.set(g.id._serialized, g);
            }
            const grupos = [...mapa.values()];
            if (grupos.length === 0) {
                console.log("❌ Nenhum grupo encontrado pelos IDs/Nomes configurados!");
                return;
            }
            console.log(`✅ Grupos encontrados: ${grupos.map(g => g.name).join(', ')}`);

            let ofertasIniciais = await buscarOfertasReais();
            if (ofertasIniciais.length < 3) {
                const ofertasAdicionais = await buscarMaisOfertas();
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
                const precos = await verificarPrecoRealNaPagina(oferta.link, browserParaVerificacao);
                if (precos && (precos.precoPor || precos.precoDe)) {
                    oferta.precoPor = precos.precoPor || oferta.precoPor;
                    oferta.precoDe = precos.precoDe || oferta.precoDe || '';
                }
                ofertasVerificadas.push(oferta);
                await new Promise(resolve => setTimeout(resolve, 1500)); 
            }
            await browserParaVerificacao.close();
            console.log("✅ Verificação de preços concluída!");
            
            const ofertasParaEnviar = ofertasVerificadas.length > 0 ? ofertasVerificadas : [];
            if (ofertasParaEnviar.length === 0) return;

            console.log(`\n📤 Preparando para enviar ${ofertasParaEnviar.length} ofertas com preços verificados...`);
            for (const oferta of ofertasParaEnviar) {
                try {
                    let descontoLinha = '';
                    if (oferta.precoDe && oferta.precoPor) {
                        const normalizar = (v) => parseFloat(v.replace(/[^0-9,]/g, '').replace(/\./g, '').replace(',', '.'));
                        const deNum = normalizar(oferta.precoDe);
                        const porNum = normalizar(oferta.precoPor);
                        if (deNum && porNum && deNum > porNum) {
                            const pct = Math.round((1 - (porNum / deNum)) * 100);
                            if (pct > 0 && pct < 100) descontoLinha = `\n🎯 Desconto: *-${pct}%*`;
                        }
                    }
                    const linhaPreco = oferta.precoDe ? `💸 ~De: ${oferta.precoDe}~\n💰 Por: *${oferta.precoPor}*${descontoLinha}` : `💰 Preço: *${oferta.precoPor}*`;
                    const linkAfiliado = await gerarLinkAfiliado(oferta.link);
                    const mensagem = `🔥 *${oferta.titulo}*\n${linhaPreco}\n🔗 ${linkAfiliado}`;
                    console.log(`   ⏳ Enviando: ${oferta.titulo} - ${oferta.precoPor}${oferta.precoDe ? ` (De ${oferta.precoDe})` : ''}`);
                    for (const grupo of grupos) {
                        if (oferta.imagem && oferta.imagem.startsWith('http')) {
                            const media = await MessageMedia.fromUrl(oferta.imagem, { unsafeMime: true, timeout: 10000 });
                            await client.sendMessage(grupo.id._serialized, media, { caption: mensagem });
                        } else {
                            await client.sendMessage(grupo.id._serialized, mensagem);
                        }
                        await new Promise(r => setTimeout(r, 1200));
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
    };

    // Executa imediatamente e agenda para todo dia às 09:00
    await rodar();
    scheduleDailyAt('', rodar);
});

console.log("⏳ Inicializando WhatsApp Web...");
client.initialize();

console.log("⏳ Inicializando WhatsApp Web...");

client.initialize();
