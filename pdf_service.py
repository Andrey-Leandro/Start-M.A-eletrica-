"""Geração de solicitações de orçamento em PDF para a Start M.A Elétrica.

O documento é criado em memória, sem banco de dados e sem salvar
os dados do visitante no servidor.
"""

from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    Image,
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# Pasta raiz do projeto: start-ma-eletrica/
RAIZ = Path(__file__).resolve().parent.parent
PASTA_STATIC = RAIZ / "static"

AZUL = colors.HexColor("#101F36")
VERMELHO = colors.HexColor("#D62839")
CINZA = colors.HexColor("#536276")
FUNDO_CLARO = colors.HexColor("#F2F5FA")
BORDA = colors.HexColor("#DCE3EC")


def _seguro(valor):
    """Evita que caracteres do formulário sejam interpretados como marcação."""
    return escape(str(valor if valor is not None else ""))


def _logo_disponivel(empresa):
    """Encontra uma logo opcional, sem impedir o PDF caso a foto não exista."""
    candidatos = [
        empresa.get("logo_completa"),
        empresa.get("logo"),
        "img/logotipocompleto.png",
        "img/logotipo.png",
    ]

    for relativo in candidatos:
        if not relativo:
            continue

        caminho = (PASTA_STATIC / str(relativo)).resolve()

        # Somente arquivos da pasta static podem ser usados.
        if not caminho.is_relative_to(PASTA_STATIC.resolve()):
            continue

        if not caminho.is_file():
            continue

        try:
            largura, altura = ImageReader(str(caminho)).getSize()
            escala = min(170 / largura, 65 / altura, 1)
            imagem = Image(
                str(caminho),
                width=largura * escala,
                height=altura * escala,
            )
            imagem.hAlign = "LEFT"
            return imagem
        except (OSError, ValueError):
            # Uma logo inválida não deve impedir a solicitação.
            continue

    return None


def _rodape(canvas, documento):
    """Adiciona uma linha e a numeração em todas as páginas."""
    canvas.saveState()
    largura, _ = A4
    canvas.setStrokeColor(BORDA)
    canvas.line(18 * mm, 17 * mm, largura - 18 * mm, 17 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(CINZA)
    canvas.drawString(
        18 * mm,
        12 * mm,
        "Start M.A Elétrica | Solicitação sem preço aprovado",
    )
    canvas.drawRightString(
        largura - 18 * mm,
        12 * mm,
        f"Página {documento.page}",
    )
    canvas.restoreState()


def criar_pdf(dados, empresa):
    """Retorna bytes de um PDF, para uso com BytesIO/send_file no app.py.

    dados: dict com nome, telefone, cidade, servico e descricao.
    empresa: dict EMPRESA do arquivo config/empresa.py.
    """
    if not isinstance(dados, dict) or not isinstance(empresa, dict):
        raise TypeError("Dados e empresa devem ser dicionários.")

    obrigatorios = ("nome", "telefone", "cidade", "servico", "descricao")
    for campo in obrigatorios:
        if not isinstance(dados.get(campo), str) or not dados[campo].strip():
            raise ValueError(f"Campo obrigatório ausente: {campo}")

    memoria = BytesIO()
    documento = SimpleDocTemplate(
        memoria,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=25 * mm,
        title="Solicitação de orçamento - Start M.A Elétrica",
        author=str(empresa.get("nome", "Start M.A Elétrica")),
    )

    estilos = {
        "empresa": ParagraphStyle(
            "EmpresaStartMA", fontName="Helvetica-Bold",
            fontSize=19, leading=23, textColor=AZUL, spaceAfter=5,
        ),
        "titulo": ParagraphStyle(
            "TituloStartMA", fontName="Helvetica-Bold",
            fontSize=16, leading=21, textColor=AZUL, spaceAfter=7,
        ),
        "secao": ParagraphStyle(
            "SecaoStartMA", fontName="Helvetica-Bold",
            fontSize=11, leading=15, textColor=AZUL, spaceAfter=8,
        ),
        "rotulo": ParagraphStyle(
            "RotuloStartMA", fontName="Helvetica-Bold",
            fontSize=9, leading=13, textColor=AZUL,
        ),
        "valor": ParagraphStyle(
            "ValorStartMA", fontName="Helvetica",
            fontSize=9, leading=14, textColor=AZUL,
        ),
        "texto": ParagraphStyle(
            "TextoStartMA", fontName="Helvetica",
            fontSize=9.5, leading=15, textColor=AZUL,
        ),
        "auxiliar": ParagraphStyle(
            "AuxiliarStartMA", fontName="Helvetica",
            fontSize=9, leading=13, textColor=CINZA,
        ),
        "descricao": ParagraphStyle(
            "DescricaoStartMA", fontName="Helvetica",
            fontSize=10, leading=16, textColor=AZUL,
            backColor=FUNDO_CLARO, borderPadding=12,
            borderColor=BORDA, borderWidth=0.6,
        ),
        "aviso": ParagraphStyle(
            "AvisoStartMA", fontName="Helvetica",
            fontSize=9, leading=14, textColor=AZUL,
            backColor=FUNDO_CLARO, borderPadding=12,
            borderColor=BORDA, borderWidth=0.6,
        ),
    }

    historia = []
    logo = _logo_disponivel(empresa)
    if logo is not None:
        historia.extend([logo, Spacer(1, 5 * mm)])

    historia.append(
        Paragraph(_seguro(empresa.get("nome", "Start M.A Elétrica")), estilos["empresa"])
    )
    historia.append(
        Paragraph(
            _seguro(empresa.get("segmento", "Elétrica e climatização")),
            estilos["auxiliar"],
        )
    )
    historia.append(
        HRFlowable(
            width="100%", thickness=2, color=VERMELHO,
            spaceBefore=5, spaceAfter=7,
        )
    )
    historia.append(Spacer(1, 5 * mm))

    def linha(rotulo, valor):
        return [
            Paragraph(_seguro(rotulo), estilos["rotulo"]),
            Paragraph(_seguro(valor), estilos["valor"]),
        ]

    # Dados da empresa, extraídos do cadastro central.
    empresa_linhas = [
        linha("Razão social", empresa.get("razao_social", "")),
        linha("CNPJ", empresa.get("cnpj", "")),
        linha("Telefone", empresa.get("telefone", "")),
        linha("Endereço", empresa.get("endereco", "")),
    ]
    tabela_empresa = Table(
        empresa_linhas,
        colWidths=[34 * mm, documento.width - 34 * mm],
        hAlign="LEFT",
    )
    tabela_empresa.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, -1), FUNDO_CLARO),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, BORDA),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDA),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    historia.extend([tabela_empresa, Spacer(1, 9 * mm)])

    historia.append(Paragraph("SOLICITAÇÃO DE ORÇAMENTO", estilos["titulo"]))
    # Horário de Brasília (UTC-3). Não depende do fuso do servidor.
    agora = datetime.now(timezone(timedelta(hours=-3)))
    historia.append(
        Paragraph(
            f"Data de emissão: {agora:%d/%m/%Y} às {agora:%H:%M} (Brasília)",
            estilos["auxiliar"],
        )
    )
    historia.append(Spacer(1, 6 * mm))
    historia.append(Paragraph("Dados da solicitação", estilos["secao"]))

    pedido_linhas = [
        linha("Nome", dados["nome"]),
        linha("Telefone", dados["telefone"]),
        linha("Cidade / bairro", dados["cidade"]),
        linha("Serviço desejado", dados["servico"]),
    ]
    tabela_pedido = Table(
        pedido_linhas,
        colWidths=[40 * mm, documento.width - 40 * mm],
        hAlign="LEFT",
    )
    tabela_pedido.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, -1), FUNDO_CLARO),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, BORDA),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDA),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    historia.extend([tabela_pedido, Spacer(1, 6 * mm)])

    historia.append(Paragraph("Descrição do serviço", estilos["secao"]))
    historia.append(Spacer(1, 4 * mm))
    historia.append(Paragraph(_seguro(dados["descricao"]), estilos["descricao"]))
    historia.append(Spacer(1, 9 * mm))

    aviso = (
        "<b>Importante:</b> este documento é uma solicitação preliminar "
        "de orçamento, não uma proposta comercial nem confirmação de "
        "atendimento. Valores, prazos e condições dependem da avaliação "
        "e aprovação da Start M.A Elétrica."
    )
    historia.append(Paragraph(aviso, estilos["aviso"]))

    documento.build(historia, onFirstPage=_rodape, onLaterPages=_rodape)
    return memoria.getvalue()
