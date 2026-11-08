/* ============================================================
   START M.A ELÉTRICA — ARQUIVO 09: JAVASCRIPT PRINCIPAL
   Compatível com base.html, index.html e style.css.
   Funções: menu responsivo, galeria, animações e rodapé.
   ============================================================ */

(() => {
  "use strict";

  /** Executa a inicialização quando os elementos HTML já existem. */
  function iniciarSite() {
    atualizarAnoRodape();
    configurarMenuMobile();
    configurarAnimacoes();
    configurarGaleria();
  }

  // O script usa "defer" no base.html, mas este teste também protege
  // caso ele seja carregado de outra maneira no futuro.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarSite, { once: true });
  } else {
    iniciarSite();
  }

  /* ------------------------------------------------------------
     01. ANO AUTOMÁTICO NO RODAPÉ
     ------------------------------------------------------------ */
  function atualizarAnoRodape() {
    const elementoAno = document.getElementById("ano");

    if (elementoAno) {
      elementoAno.textContent = String(new Date().getFullYear());
    }
  }

  /* ------------------------------------------------------------
     02. MENU MOBILE
     Usa as classes .menu-toggle, .nav-menu e .open do CSS.
     ------------------------------------------------------------ */
  function configurarMenuMobile() {
    const botaoMenu = document.querySelector(".menu-toggle");
    const menu = document.getElementById("nav-menu");

    // Nas páginas sem esse cabeçalho, o restante do JS continua.
    if (!botaoMenu || !menu) return;

    const telaMobile = window.matchMedia("(max-width: 900px)");

    function estaAberto() {
      return menu.classList.contains("open");
    }

    function definirEstado(aberto) {
      // O menu suspenso só deve existir no layout de celular/tablet.
      const abrir = Boolean(aberto && telaMobile.matches);

      menu.classList.toggle("open", abrir);
      botaoMenu.setAttribute("aria-expanded", String(abrir));
      botaoMenu.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
      botaoMenu.textContent = abrir ? "×" : "☰";
    }

    botaoMenu.addEventListener("click", () => {
      definirEstado(!estaAberto());
    });

    // Ao selecionar uma página ou seção, o menu se fecha.
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => definirEstado(false));
    });

    // Clique fora do menu e do botão fecha a navegação.
    document.addEventListener("click", (evento) => {
      if (!estaAberto()) return;

      const clicouNoMenu = menu.contains(evento.target);
      const clicouNoBotao = botaoMenu.contains(evento.target);

      if (!clicouNoMenu && !clicouNoBotao) {
        definirEstado(false);
      }
    });

    // Tecla Esc fecha o menu e devolve o foco ao botão.
    document.addEventListener("keydown", (evento) => {
      if (evento.key !== "Escape" || !estaAberto()) return;

      definirEstado(false);
      botaoMenu.focus();
    });

    // Não deixa o menu suspenso aberto após mudar para desktop.
    if (typeof telaMobile.addEventListener === "function") {
      telaMobile.addEventListener("change", () => definirEstado(false));
    } else if (typeof telaMobile.addListener === "function") {
      telaMobile.addListener(() => definirEstado(false));
    }

    definirEstado(false);
  }

  /* ------------------------------------------------------------
     03. ANIMAÇÕES DISCRETAS NA ROLAGEM
     CSS: .reveal e .reveal.visible
     ------------------------------------------------------------ */
  function configurarAnimacoes() {
    const elementos = document.querySelectorAll(".reveal");
    if (!elementos.length) return;

    const movimentoReduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Sem suporte a IntersectionObserver ou com movimento reduzido,
    // o conteúdo permanece visível, sem depender de animação.
    if (movimentoReduzido || !("IntersectionObserver" in window)) {
      return;
    }

    const observador = new IntersectionObserver(
      (entradas, observer) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;

          entrada.target.classList.add("visible");
          observer.unobserve(entrada.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    elementos.forEach((elemento) => observador.observe(elemento));
  }

  /* ------------------------------------------------------------
     04. GALERIA DE FOTOS EM TELA AMPLIADA
     HTML: #lightbox, .lightbox-close e .gallery-item[data-image]
     ------------------------------------------------------------ */
  function configurarGaleria() {
    const modal = document.getElementById("lightbox");
    const botoes = document.querySelectorAll(".gallery-item[data-image]");

    // As páginas de orçamento e calculadora não possuem galeria.
    if (!modal || !botoes.length) return;

    const imagemAmpliada = modal.querySelector("img");
    const botaoFechar = modal.querySelector(".lightbox-close");

    if (!imagemAmpliada || !botaoFechar) {
      console.warn("Galeria: estrutura do lightbox incompleta.");
      return;
    }

    // Mensagem de erro mostrada caso alguma imagem esteja indisponível.
    const mensagemErro = document.createElement("p");
    mensagemErro.setAttribute("role", "alert");
    mensagemErro.textContent = "Não foi possível carregar esta imagem.";
    mensagemErro.style.color = "#ffffff";
    mensagemErro.style.textAlign = "center";
    mensagemErro.style.padding = "16px";
    mensagemErro.hidden = true;
    modal.appendChild(mensagemErro);

    let ultimoBotao = null;

    function fecharGaleria() {
      if (modal.open && typeof modal.close === "function") {
        modal.close();
      }
    }

    function abrirGaleria(botao) {
      const enderecoImagem = botao.dataset.image;
      if (!enderecoImagem) return;

      // Fallback para navegadores antigos sem suporte a <dialog>.
      if (typeof modal.showModal !== "function") {
        window.open(enderecoImagem, "_blank", "noopener,noreferrer");
        return;
      }

      ultimoBotao = botao;
      mensagemErro.hidden = true;
      imagemAmpliada.hidden = false;
      imagemAmpliada.alt =
        botao.querySelector("img")?.alt || "Foto ampliada da galeria";

      imagemAmpliada.onload = () => {
        mensagemErro.hidden = true;
        imagemAmpliada.hidden = false;
      };

      imagemAmpliada.onerror = () => {
        imagemAmpliada.hidden = true;
        mensagemErro.hidden = false;
        console.warn("Galeria: imagem indisponível.");
      };

      imagemAmpliada.src = enderecoImagem;

      try {
        if (!modal.open) modal.showModal();
        botaoFechar.focus();
      } catch (erro) {
        console.error("Não foi possível abrir a galeria:", erro);
        window.open(enderecoImagem, "_blank", "noopener,noreferrer");
      }
    }

    botoes.forEach((botao) => {
      botao.addEventListener("click", () => abrirGaleria(botao));
    });

    botaoFechar.addEventListener("click", fecharGaleria);

    // Fecha somente se o clique ocorreu fora da caixa do <dialog>.
    modal.addEventListener("click", (evento) => {
      if (evento.target !== modal) return;

      const retangulo = modal.getBoundingClientRect();
      const foraDaCaixa =
        evento.clientX < retangulo.left ||
        evento.clientX > retangulo.right ||
        evento.clientY < retangulo.top ||
        evento.clientY > retangulo.bottom;

      if (foraDaCaixa) fecharGaleria();
    });

    // Esc é tratado nativamente pelo <dialog>. Ao fechar, o foco
    // volta para a foto que o visitante estava visualizando.
    modal.addEventListener("close", () => {
      imagemAmpliada.removeAttribute("src");
      imagemAmpliada.onload = null;
      imagemAmpliada.onerror = null;
      mensagemErro.hidden = true;

      if (ultimoBotao && ultimoBotao.isConnected && !ultimoBotao.hidden) {
        ultimoBotao.focus({ preventScroll: true });
      }
    });
  }
})();
