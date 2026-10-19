const { app, BrowserWindow, screen } = require("electron");
const express = require("express");

const servidor = express();
servidor.use(express.json());

const CHAVE = "chave-lab-2026-trocar";

let janela;

function criarJanela() {

const { width, height } = screen.getPrimaryDisplay().workAreaSize;

const largura = 260;
const altura = 110;

    janela = new BrowserWindow({
        width: largura,
    	height: altura,

    	x: width - largura,
    	y: height - altura,
        alwaysOnTop: true,
        resizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    janela.loadURL("data:text/html;charset=utf-8," +
        encodeURIComponent(`
        <body style="
            background: #202020;
            color: white;
            font-family: Arial;
            text-align: center;
            margin-top: 15px;
        ">
            <div>Tempo restante</div>
            <h1 id="tempo">--:--</h1>

            <script>
                let fim = null;
                let intervalo = null;

                function atualizar() {
                    if (fim === null) return;

                    const restante = Math.max(
                        0,
                        Math.ceil((fim - Date.now()) / 1000)
                    );

                    const minutos = Math.floor(restante / 60);
                    const segundos = restante % 60;

                    document.getElementById("tempo").textContent =
                        String(minutos).padStart(2, "0") + ":" +
                        String(segundos).padStart(2, "0");

                    if (restante === 0) {
                        clearInterval(intervalo);
                        intervalo = null;
                        fim = null;
                    }
                }

                function iniciarTimer(segundos) {
                    if (intervalo) clearInterval(intervalo);

                    fim = Date.now() + segundos * 1000;

                    atualizar();
                    intervalo = setInterval(atualizar, 250);
                }

                window.iniciarTimer = iniciarTimer;
            </script>
        </body>
    `));
}

servidor.post("/timer", (req, res) => {
    if (req.headers["x-agent-token"] !== CHAVE) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Acesso não autorizado"
        });
    }

    const segundos = Number(req.body.segundos);

    if (!Number.isInteger(segundos) || segundos <= 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Tempo inválido"
        });
    }

    if (!janela || janela.isDestroyed()) {
        return res.status(503).json({
            sucesso: false,
            mensagem: "Janela ainda não está pronta"
        });
    }

    janela.webContents.executeJavaScript(
        `window.iniciarTimer(${segundos})`
    );

    res.json({
        sucesso: true,
        mensagem: "Cronômetro iniciado"
    });
});

app.whenReady().then(() => {
    criarJanela();

    servidor.listen(3001, "0.0.0.0", () => {
        console.log("Agente aguardando mensagens na porta 3001");
    });
});