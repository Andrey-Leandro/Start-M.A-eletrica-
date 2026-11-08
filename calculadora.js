/* ============================================================
   START M.A ELÉTRICA — ARQUIVO 11: CALCULADORA DE CONSUMO
   Página: templates/calculadora.html
   Cálculo local: não envia os dados ao servidor.
   ============================================================ */

(() => {
  "use strict";

  const formatarEnergia = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  const formatarDinheiro = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function iniciarCalculadora() {
    const formulario = document.getElementById("calc-form");

    // O main.js é compartilhado, mas esta página é opcional.
    if (!formulario) return;

    const campos = {
      potencia: document.getElementById("potencia"),
      horas: document.getElementById("horas"),
      dias: document.getElementById("dias"),
      tarifa: document.getElementById("tarifa"),
    };

    const resultadoKwh = document.getElementById("resultado-kwh");
    const resultadoValor = document.getElementById("resultado-valor");
    const botaoCalcular = document.getElementById("btn-calcular");

    if (
      Object.values(campos).some((campo) => !campo) ||
      !resultadoKwh || !resultadoValor || !botaoCalcular
    ) {
      console.error("Calculadora: elementos obrigatórios ausentes no HTML.");
      return;
    }

    // Vamos fornecer mensagens próprias em vez da validação nativa,
    // para que os erros também apareçam em um aviso acessível.
    formulario.noValidate = true;

    const mensagemErro = document.createElement("p");
    mensagemErro.id = "erro-calculadora";
    mensagemErro.className = "field-help";
    mensagemErro.style.color = "#b51e30";
    mensagemErro.style.fontWeight = "700";
    mensagemErro.setAttribute("role", "alert");
    mensagemErro.hidden = true;
    botaoCalcular.insertAdjacentElement("beforebegin", mensagemErro);

    const regras = [
      {
        campo: campos.potencia,
        chave: "potencia",
        valido: (numero) => numero > 0,
        erro: "Informe uma potência maior que zero, em watts (W).",
      },
      {
        campo: campos.horas,
        chave: "horas",
        valido: (numero) => numero >= 0 && numero <= 24,
        erro: "Informe as horas diárias entre 0 e 24.",
      },
      {
        campo: campos.dias,
        chave: "dias",
        valido: (numero) =>
          Number.isInteger(numero) && numero >= 1 && numero <= 31,
        erro: "Informe um número inteiro de dias, entre 1 e 31.",
      },
      {
        campo: campos.tarifa,
        chave: "tarifa",
        valido: (numero) => numero >= 0,
        erro: "Informe uma tarifa válida, igual ou maior que zero.",
      },
    ];

    function limparErro() {
      mensagemErro.hidden = true;
      mensagemErro.textContent = "";

      for (const { campo } of regras) {
        campo.removeAttribute("aria-invalid");
      }
    }

    function informarErro(campo, mensagem) {
      mensagemErro.textContent = mensagem;
      mensagemErro.hidden = false;
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }

    function limparResultados() {
      resultadoKwh.textContent = "— kWh";
      resultadoValor.textContent = "—";
    }

    function obterValores(exibirErros) {
      const valores = {};

      for (const { campo, chave, valido, erro } of regras) {
        // valueAsNumber respeita a semântica de input type="number".
        // O navegador trata a entrada decimal de acordo com o idioma.
        const numero = campo.valueAsNumber;
        const correto =
          campo.value.trim() !== "" &&
          !campo.validity.badInput &&
          Number.isFinite(numero) &&
          valido(numero);

        if (!correto) {
          if (exibirErros) informarErro(campo, erro);
          return null;
        }

        valores[chave] = numero;
      }

      return valores;
    }

    function calcular(exibirErros = false) {
      limparErro();

      const valores = obterValores(exibirErros);
      if (!valores) {
        limparResultados();
        return false;
      }

      // Potência (W) / 1.000 = potência em kW.
      // Consumo (kWh) = kW x horas por dia x dias de utilização.
      const consumoKwh =
        (valores.potencia / 1000) * valores.horas * valores.dias;
      const custoEstimado = consumoKwh * valores.tarifa;

      if (!Number.isFinite(consumoKwh) || !Number.isFinite(custoEstimado)) {
        limparResultados();
        if (exibirErros) {
          mensagemErro.textContent =
            "Os valores são muito grandes para calcular. Revise os campos.";
          mensagemErro.hidden = false;
        }
        return false;
      }

      resultadoKwh.textContent = `${formatarEnergia.format(consumoKwh)} kWh`;
      resultadoValor.textContent = formatarDinheiro.format(custoEstimado);
      return true;
    }

    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      calcular(true);
    });

    // Atualiza silenciosamente quando os campos estão corretos.
    // Durante uma digitação incompleta, remove os resultados antigos,
    // sem exibir alertas repetidos a cada tecla.
    for (const campo of Object.values(campos)) {
      campo.addEventListener("input", () => calcular(false));
      campo.addEventListener("change", () => calcular(false));
    }

    // Os valores de exemplo do HTML são calculados ao abrir a página.
    calcular(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarCalculadora, {
      once: true,
    });
  } else {
    iniciarCalculadora();
  }
})();
