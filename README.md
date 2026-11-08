# Start M.A Elétrica — versão Python/Flask pronta para GitHub e Render

Esta pasta contém a versão Flask completa com as 9 fotografias recebidas, logo, páginas, calculadora e gerador PDF. Não é um site estático do Netlify.

## Estrutura e propósito

- `app.py`: recebe rotas e dados do formulário; envia PDF ao navegador.
- `config/empresa.py`: centraliza nome, serviços, telefone e CNPJ.
- `services/pdf_service.py`: constrói documento PDF em memória com ReportLab.
- `templates/`: telas HTML, usando Jinja2.
- `static/css/style.css`: estilo e responsividade.
- `static/js/`: funcionalidades do menu, calculadora e solicitação.
- `static/img/`: logos e as nove fotografias em JPG real.
- `requirements.txt`: dependências Python.
- `render.yaml`: ensina o Render a instalar e iniciar nosso app.
- `.gitignore`: evita enviar arquivos pessoais ou temporários ao GitHub.
- `.env.example`: exemplo, não contem credencial real.

## Como executar no VS Code (PowerShell, Windows)

Abra esta pasta como projeto no VS Code, depois execute:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Abra http://127.0.0.1:5000. Opcional: execute testes com `.\.venv\Scripts\python.exe -m pytest -q`.

## Publicar no Render com GitHub

1. Crie um repositório GitHub e envie **o conteúdo desta pasta** para a raiz.
2. No Render, clique `New` > `Blueprint` e conecte o repositório.
3. O arquivo `render.yaml` define a instalação e a inicialização.
4. Aguarde o status `Live` e abra o endereço `https://...onrender.com`.

Alternativa: `New` > `Web Service`, escolher o repositório e usar:
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`

## Atenção

- `logotipocompleto.png` é a arte original enviada, que ainda não contém o prefixo Start. O site e o PDF usam o símbolo `logotipo.png` e o nome escrito em HTML/PDF.
- As fotos fornecidas são imagens de apresentação. Não declare que sejam obras reais do profissional sem confirmação.
- A geração de PDF apenas baixa uma solicitação; não envia o arquivo à empresa. O visitante envia o contato pelo WhatsApp.
- O plano gratuito do Render pode ficar inativo após um período sem visitas. Use apenas para teste/demonstração.
- Antes de oferecer o serviço em produção, confira dados cadastrais, serviços prestados, direitos de uso de imagens, LGPD e controles antiabuso.
