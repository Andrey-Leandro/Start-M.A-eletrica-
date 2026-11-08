import os
from io import BytesIO
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv
from config.empresa import EMPRESA, SERVICOS
from services.pdf_service import criar_pdf

load_dotenv()
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "local-development-only")

@app.context_processor
def dados_globais():
    return {"empresa": EMPRESA, "servicos": SERVICOS}

@app.get("/")
def inicio():
    return render_template("index.html")

@app.get("/orcamento")
def orcamento():
    return render_template("orcamento.html")

@app.get("/calculadora")
def calculadora():
    return render_template("calculadora.html")

@app.post("/api/orcamento/pdf")
def gerar_pdf():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify(erro="Envie os dados em JSON."), 400
    campos = {"nome": 100, "telefone": 30, "servico": 100, "descricao": 1500, "cidade": 100}
    limpos = {}
    for campo, limite in campos.items():
        valor = dados.get(campo, "")
        if not isinstance(valor, str):
            return jsonify(erro=f"Campo inválido: {campo}."), 400
        valor = " ".join(valor.split())
        if not valor or len(valor) > limite:
            return jsonify(erro=f"Preencha {campo} (até {limite} caracteres)."), 400
        limpos[campo] = valor
    if limpos["servico"] not in SERVICOS:
        return jsonify(erro="Selecione um serviço válido."), 400
    arquivo = BytesIO(criar_pdf(limpos, EMPRESA))
    arquivo.seek(0)
    return send_file(arquivo, mimetype="application/pdf", as_attachment=True,
                     download_name=f"solicitacao-start-ma-{datetime.now():%Y%m%d}.pdf")

@app.errorhandler(413)
def arquivo_grande(_):
    return jsonify(erro="Solicitação muito grande."), 413

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
