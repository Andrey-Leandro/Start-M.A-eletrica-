/* ============================================================
   START M.A ELÉTRICA — ARQUIVO 10: ORÇAMENTO
   Página: templates/orcamento.html
   Backend: POST /api/orcamento/pdf (Flask + ReportLab)

   Este script NÃO envia o orçamento ao proprietário:
   ele permite baixar o PDF e preparar uma mensagem no WhatsApp.
   ============================================================ */

(() => {
  "use strict";

  const ENDPOINT_PDF = "/api/orcamento/pdf";
  const WHATSAPP_RESERVA = "5511947933155";
  const TEMPO_LIMITE_MS = 60000;

  function iniciar() {
    const formulario = document.getElementById("form-orcamento");
    if (!formulario) return; // Outras páginas não têm este formulário.

    const status = document.getElementById("form-status");
    const botaoPdf = document.getElementById("btn-pdf");
    const botaoWhatsapp = document.getElementById("btn-whatsapp");
    const aceite = document.getElementById("ciente");

    const campos = {
      nome: document.getElementById("nome"),
      telefone: document.getElementById("telefone"),
      cidade: document.getElementById("cidade"),
      servico: document.getElementById("servico"),
      descricao: document.getElementById("descricao"),
    };

    const todosPresentes = [
      status, botaoPdf, botaoWhatsapp, aceite, ...Object.values(campos),
    ].every(Boolean);

    if (!todosPresentes) {
      console.error("Orçamento: faltam elementos obrigatórios no HTML.");
      return;
    }

    let gerando = false;
    const rotuloOriginal = botaoPdf.textContent;

    // Usa o número da empresa renderizado pelo Flask no HTML.
    // O número de reserva é usado apenas se o link não for encontrado.
    function obterNumeroWhatsapp() {
      const contato = document.querySelector('.info-box a[href^="https://wa.me/"]');
      const endereco = contato ? contato.href : "";
      const resultado = endereco.match(/^https:\/\/wa\.me\/(\d{10,15})(?:[/?#]|$)/);
      return resultado ? resultado[1] : WHATSAPP_RESERVA;
    }

    function informar(texto, tipo = "informacao") {
      status.textContent = texto;
      status.setAttribute("data-state", tipo);
      status.style.color = tipo === "erro"
        ? "#b51e30"
        : tipo === "sucesso" ? "#13734c" : "#52637a";
    }

    function falha(campo, mensagem) {
      campo.setAttribute("aria-invalid", "true");
      informar(mensagem, "erro");
      campo.focus();
      return null;
    }

    // Equivale à normalização de espaços feita no app.py.
    function limpar(valor) {
      return String(valor || "").replace(/\s+/g, " ").trim();
    }

    function validarFormulario() {
      const dados = {};
      Object.entries(campos).forEach(([chave, campo]) => {
        dados[chave] = limpar(campo.value);
        campo.removeAttribute("aria-invalid");
      });
      aceite.removeAttribute("aria-invalid");

      if (dados.nome.length < 2 || dados.nome.length > 100) {
        return falha(campos.nome, "Informe seu nome com 2 a 100 caracteres.");
      }

      const telefoneNumerico = dados.telefone.replace(/\D/g, "");
      if (dados.telefone.length > 30 || ![10, 11].includes(telefoneNumerico.length)) {
        return falha(campos.telefone, "Informe um telefone com DDD, contendo 10 ou 11 dígitos.");
      }

      if (dados.cidade.length < 2 || dados.cidade.length > 100) {
        return falha(campos.cidade, "Informe a cidade e o bairro (até 100 caracteres).");
      }

      const servicoValido = Array.from(campos.servico.options).some(
        (opcao) => opcao.value === dados.servico && !opcao.disabled
      );
      if (!servicoValido || dados.servico.length > 100) {
        return falha(campos.servico, "Selecione um serviço válido da lista.");
      }

      if (dados.descricao.length < 10 || dados.descricao.length > 1500) {
        return falha(campos.descricao, "Descreva o serviço com 10 a 1.500 caracteres.");
      }

      if (!aceite.checked) {
        return falha(aceite, "Confirme que entende que o PDF não é um orçamento aprovado.");
      }

      informar("");
      return dados;
    }

    function baixarPdf(arquivo) {
      const endereco = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = endereco;
      link.download = "solicitacao-start-ma-eletrica.pdf";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Concede tempo para o navegador concluir a leitura do arquivo.
      window.setTimeout(() => URL.revokeObjectURL(endereco), 30000);
    }

    async function gerarPdf(evento) {
      evento.preventDefault();
      if (gerando) return;

      const dados = validarFormulario();
      if (!dados) return;

      gerando = true;
      botaoPdf.disabled = true;
      botaoPdf.textContent = "Gerando seu PDF...";
      informar("Preparando sua solicitação. Aguarde...", "informacao");

      const controle = new AbortController();
      const limite = window.setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

      try {
        const resposta = await fetch(ENDPOINT_PDF, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/pdf",
          },
          body: JSON.stringify(dados),
          signal: controle.signal,
        });

        if (!resposta.ok) {
          const retorno = await resposta.json().catch(() => null);
          const mensagem = retorno && typeof retorno.erro === "string"
            ? retorno.erro
            : resposta.status === 413
              ? "A solicitação ultrapassou o tamanho permitido."
              : "O servidor não conseguiu gerar o documento. Tente novamente.";
          throw new Error(mensagem);
        }

        const tipo = resposta.headers.get("content-type") || "";
        if (!tipo.includes("application/pdf")) {
          throw new Error("O servidor retornou um formato de arquivo inesperado.");
        }

        const arquivo = await resposta.blob();
        const assinatura = await arquivo.slice(0, 5).text();
        if (arquivo.size < 5 || assinatura !== "%PDF-") {
          throw new Error("O documento recebido não é um PDF válido.");
        }

        baixarPdf(arquivo);
        informar(
          "PDF preparado! Confira os downloads do navegador. Para encaminhar à empresa, anexe o arquivo manualmente no WhatsApp.",
          "sucesso"
        );
      } catch (erro) {
        if (erro.name === "AbortError") {
          informar("A geração demorou demais. Verifique sua conexão e tente novamente.", "erro");
        } else if (!navigator.onLine) {
          informar("Você está sem conexão com a internet. Tente novamente quando estiver conectado.", "erro");
        } else {
          informar(erro.message || "Ocorreu um erro ao gerar o PDF.", "erro");
          console.error("Falha na geração do PDF:", erro);
        }
      } finally {
        window.clearTimeout(limite);
        botaoPdf.disabled = false;
        botaoPdf.textContent = rotuloOriginal;
        gerando = false;
      }
    }

    function prepararWhatsapp() {
      const dados = validarFormulario();
      if (!dados) return;

      const mensagem = [
        "Olá! Gostaria de solicitar um orçamento com a Start M.A Elétrica.",
        "",
        `*Nome:* ${dados.nome}`,
        `*Telefone:* ${dados.telefone}`,
        `*Cidade / bairro:* ${dados.cidade}`,
        `*Serviço:* ${dados.servico}`,
        `*Descrição:* ${dados.descricao}`,
        "",
        "Aguardo orientações sobre a avaliação do serviço.",
      ].join("\n");

      const endereco = `https://wa.me/${obterNumeroWhatsapp()}?text=${encodeURIComponent(mensagem)}`;
      const link = document.createElement("a");
      link.href = endereco;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();

      informar("Mensagem preparada no WhatsApp. Confira os dados e toque em Enviar para concluir o contato.", "informacao");
    }

    // Remove a marca de erro quando o visitante corrige um campo.
    formulario.addEventListener("input", (evento) => {
      if (evento.target && evento.target.removeAttribute) {
        evento.target.removeAttribute("aria-invalid");
      }
    });
    formulario.addEventListener("change", (evento) => {
      if (evento.target && evento.target.removeAttribute) {
        evento.target.removeAttribute("aria-invalid");
      }
    });

    formulario.addEventListener("submit", gerarPdf);
    botaoWhatsapp.addEventListener("click", prepararWhatsapp);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
