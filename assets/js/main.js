/* Gomes Soluções Industriais — comportamento do site */
(function () {
  "use strict";

  // Número que recebe as mensagens do formulário (DDI + DDD + número, só dígitos).
  var WHATSAPP = "5519989090391";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- cabeçalho ---------- */
  var header = $(".site-header");
  var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- menu no celular ---------- */
  var toggle = $(".menu-toggle");
  var nav = $("#menu");
  var setMenu = function (open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    $(".sr-only", toggle).textContent = open ? "Fechar menu" : "Abrir menu";
  };
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  /* ---------- link ativo no menu ---------- */
  var links = $$(".site-nav ul a");
  var secoes = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window && secoes.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secoes.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- animação de entrada ---------- */
  var revelar = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revelar.forEach(function (el) { io.observe(el); });
  } else {
    revelar.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- filtro de projetos ---------- */
  var filtros = $$(".filtro");
  var projetos = $$(".projeto");
  filtros.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cat = btn.dataset.filtro;
      filtros.forEach(function (b) {
        var ativo = b === btn;
        b.classList.toggle("is-active", ativo);
        b.setAttribute("aria-pressed", String(ativo));
      });
      projetos.forEach(function (p) {
        var mostrar = cat === "todos" || p.dataset.cat === cat || p.dataset.cat === "sempre";
        p.hidden = !mostrar;
        if (mostrar) p.classList.add("is-visible");
      });
    });
  });

  /* ---------- galeria (lightbox) ---------- */
  var lb = $("#lightbox");
  var lbImg = $("#lb-img");
  var lbTitulo = $("#lb-titulo");
  var lbContador = $("#lb-contador");
  var galeria = null;
  var indice = 0;
  var origem = null;

  var mostrarFoto = function (i) {
    var fotos = galeria.fotos;
    indice = (i + fotos.length) % fotos.length;
    var foto = fotos[indice];
    lbImg.src = foto.src;
    lbImg.width = foto.w;
    lbImg.height = foto.h;
    lbImg.alt = galeria.titulo + " (foto " + (indice + 1) + " de " + fotos.length + ")";
    lbTitulo.textContent = galeria.titulo;
    lbContador.textContent = (indice + 1) + " / " + fotos.length;
    var prox = fotos[(indice + 1) % fotos.length];
    if (prox) { new Image().src = prox.src; }
  };

  var abrirGaleria = function (slug, botao) {
    galeria = (window.GALERIAS || {})[slug];
    if (!galeria || !galeria.fotos.length) return;
    origem = botao || null;
    lb.hidden = false;
    document.body.classList.add("sem-rolagem");
    var unica = galeria.fotos.length < 2;
    $(".lb-ant", lb).hidden = unica;
    $(".lb-prox", lb).hidden = unica;
    mostrarFoto(0);
    $(".lb-fechar", lb).focus();
  };

  var fecharGaleria = function () {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.classList.remove("sem-rolagem");
    if (origem) origem.focus();
  };

  $$("[data-galeria]").forEach(function (btn) {
    btn.addEventListener("click", function () { abrirGaleria(btn.dataset.galeria, btn); });
  });
  $(".lb-fechar", lb).addEventListener("click", fecharGaleria);
  $(".lb-ant", lb).addEventListener("click", function () { mostrarFoto(indice - 1); });
  $(".lb-prox", lb).addEventListener("click", function () { mostrarFoto(indice + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) fecharGaleria(); });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") fecharGaleria();
    else if (e.key === "ArrowLeft") mostrarFoto(indice - 1);
    else if (e.key === "ArrowRight") mostrarFoto(indice + 1);
    else if (e.key === "Tab") {
      // mantém o foco dentro da galeria
      var focaveis = $$("button:not([hidden])", lb);
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  });

  // deslizar no celular
  var toqueX = null;
  lb.addEventListener("touchstart", function (e) { toqueX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (toqueX === null) return;
    var dx = e.changedTouches[0].clientX - toqueX;
    toqueX = null;
    if (Math.abs(dx) > 50) mostrarFoto(indice + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- formulário → WhatsApp ---------- */
  var form = $("#form-contato");
  var erro = $("#form-erro");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = form.nome.value.trim();
    var empresa = form.empresa.value.trim();
    var servico = form.servico.value;
    var mensagem = form.mensagem.value.trim();

    form.nome.classList.toggle("is-invalid", !nome);
    form.mensagem.classList.toggle("is-invalid", !mensagem);
    if (!nome || !mensagem) {
      erro.hidden = false;
      (nome ? form.mensagem : form.nome).focus();
      return;
    }
    erro.hidden = true;

    var texto = "Olá! Meu nome é " + nome + (empresa ? ", da empresa " + empresa : "") + "." +
      "\nServiço de interesse: " + servico + "." +
      "\n\n" + mensagem;
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  });

  /* ---------- serviços: abre um item por vez ---------- */
  var itensServico = $$(".servico-item");
  itensServico.forEach(function (item) {
    var botao = $(".servico-btn", item);
    botao.addEventListener("click", function () {
      var abrir = !item.classList.contains("is-open");
      itensServico.forEach(function (outro) {
        outro.classList.remove("is-open");
        $(".servico-btn", outro).setAttribute("aria-expanded", "false");
      });
      if (abrir) {
        item.classList.add("is-open");
        botao.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- números que contam ao aparecer ---------- */
  var milhar = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var contar = function (el) {
    var alvo = Number(el.dataset.count), prefixo = el.dataset.prefix || "", inicio = null;
    var passo = function (agora) {
      if (inicio === null) inicio = agora;
      var p = Math.min(1, (agora - inicio) / 1400);
      el.textContent = prefixo + milhar(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  if ("IntersectionObserver" in window) {
    var ioContagem = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { contar(en.target); ioContagem.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { ioContagem.observe(el); });
  }

  /* ---------- manifesto: as palavras acendem conforme a página rola ---------- */
  var manifesto = $("#manifesto");
  if (manifesto) {
    var palavras = [];
    Array.prototype.slice.call(manifesto.childNodes).forEach(function (no) {
      if (no.nodeType === 3) {
        var frag = document.createDocumentFragment();
        no.textContent.split(/(\s+)/).forEach(function (parte) {
          if (!parte) return;
          if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(" ")); return; }
          var span = document.createElement("span");
          span.className = "pal";
          span.textContent = parte;
          frag.appendChild(span);
          palavras.push(span);
        });
        manifesto.replaceChild(frag, no);
      } else if (no.nodeType === 1) {
        no.classList.add("pal");
        palavras.push(no);
      }
    });
    var acender = function () {
      var r = manifesto.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.88 - r.top) / (r.height + vh * 0.3);
      var n = Math.round(Math.max(0, Math.min(1, p)) * palavras.length);
      palavras.forEach(function (el, i) { el.classList.toggle("is-on", i < n); });
    };
    window.addEventListener("scroll", acender, { passive: true });
    window.addEventListener("resize", acender);
    acender();
  }

  /* ---------- ano no rodapé ---------- */
  var ano = $("#ano");
  if (ano) ano.textContent = String(new Date().getFullYear());
})();
