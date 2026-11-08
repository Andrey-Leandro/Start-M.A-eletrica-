"""Testes básicos da Start M.A Elétrica (executar: python -m pytest -q)."""

import pytest

from app import app
from config.empresa import SERVICOS


@pytest.fixture
def cliente():
    app.config.update(TESTING=True)
    with app.test_client() as navegador:
        yield navegador


def pedido_valido():
    return {
        "nome": "Cliente Teste",
        "telefone": "11999999999",
        "cidade": "Jandira - SP",
        # Pega um serviço cadastrado de verdade, sem depender do nome exato.
        "servico": SERVICOS[0],
        "descricao": "Solicito uma avaliação para este serviço elétrico.",
    }


def test_paginas_principais(cliente):
    for rota in ("/", "/orcamento", "/calculadora"):
        resposta = cliente.get(rota)
        assert resposta.status_code == 200
        assert b"text/html" in resposta.content_type.encode("utf-8")


def test_geracao_de_pdf(cliente):
    resposta = cliente.post("/api/orcamento/pdf", json=pedido_valido())
    assert resposta.status_code == 200
    assert resposta.mimetype == "application/pdf"
    assert resposta.data.startswith(b"%PDF-")
    assert len(resposta.data) > 1000
    assert "attachment" in resposta.headers.get("Content-Disposition", "")


def test_pedido_vazio(cliente):
    resposta = cliente.post("/api/orcamento/pdf", json={})
    assert resposta.status_code == 400
    assert "erro" in resposta.get_json()


def test_pedido_sem_json(cliente):
    resposta = cliente.post(
        "/api/orcamento/pdf",
        data="texto qualquer",
        content_type="text/plain",
    )
    assert resposta.status_code == 400


def test_servico_nao_cadastrado(cliente):
    pedido = pedido_valido()
    pedido["servico"] = "Serviço inventado"
    resposta = cliente.post("/api/orcamento/pdf", json=pedido)
    assert resposta.status_code == 400


def test_campo_com_tipo_incorreto(cliente):
    pedido = pedido_valido()
    pedido["nome"] = ["nome em lista"]
    resposta = cliente.post("/api/orcamento/pdf", json=pedido)
    assert resposta.status_code == 400


def test_requisicao_grande_demais(cliente):
    pedido = pedido_valido()
    pedido["descricao"] = "x" * 20000
    resposta = cliente.post("/api/orcamento/pdf", json=pedido)
    assert resposta.status_code == 413
