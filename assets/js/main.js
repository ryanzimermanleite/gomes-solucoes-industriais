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

  /* ---------- pasta do cliente (vídeos, fotos e descrição) ---------- */
  var pasta = $("#pasta");
  var painel = $("#pasta-painel");
  var pastaOrigem = null;
  var pastaAberta = function () { return !!pasta && !pasta.hidden; };

  var criar = function (tag, classe, texto) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  };

  var pararVideos = function (menos) {
    $$("video", pasta).forEach(function (v) { if (v !== menos) v.pause(); });
  };

  var montarPasta = function (dados, botao) {
    var logo = $(".pasta-logo", pasta);
    logo.hidden = !dados.logo;
    logo.classList.toggle("is-larga", !!dados.logoLarga);
    if (dados.logo) $("#pasta-logo").src = dados.logo;
    $("#pasta-nome").textContent = dados.nome;
    $("#pasta-local").textContent = dados.local;
    $("#pasta-titulo").textContent = dados.titulo;
    $("#pasta-descricao").textContent = dados.descricao || "";
    $("#pasta-descricao").hidden = !dados.descricao;

    // pastas só de fotos apontam para uma galeria de window.GALERIAS; a miniatura é o mesmo arquivo com "-p"
    var listaFotos = dados.fotos;
    if (!listaFotos && dados.galeria) {
      listaFotos = (((window.GALERIAS || {})[dados.galeria] || {}).fotos || []).map(function (f) {
        return { src: f.src, w: f.w, h: f.h, p: f.src.replace(/\.webp$/, "-p.webp") };
      });
    }

    var itens = $("#pasta-itens");
    itens.textContent = "";
    (dados.itens || []).forEach(function (t) { itens.appendChild(criar("li", "", t)); });

    var videos = $("#pasta-videos");
    videos.textContent = "";
    (dados.videos || []).forEach(function (v) {
      var fig = criar("figure", "pasta-video");
      var video = criar("video");
      video.controls = true;
      video.preload = "none";
      video.poster = v.capa;
      video.src = v.src;
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-label", dados.nome + ": " + v.legenda);
      video.addEventListener("play", function () { pararVideos(video); });
      fig.appendChild(video);
      fig.appendChild(criar("figcaption", "", v.legenda));
      videos.appendChild(fig);
    });
    $("#pasta-sub-videos").hidden = !(dados.videos || []).length;

    var fotos = $("#pasta-fotos");
    fotos.textContent = "";
    var album = { titulo: dados.titulo + " — " + dados.local, fotos: listaFotos || [] };
    album.fotos.forEach(function (f, i) {
      var b = criar("button", "pasta-foto");
      b.type = "button";
      b.setAttribute("aria-label", "Ampliar foto " + (i + 1) + " de " + album.fotos.length);
      var img = criar("img");
      img.src = f.p || f.src;
      img.alt = "";
      img.loading = "lazy";
      b.appendChild(img);
      b.addEventListener("click", function () { abrirGaleria(album, b, i); });
      fotos.appendChild(b);
    });
    $("#pasta-sub-fotos").hidden = !album.fotos.length;
  };

  // o painel "nasce" do cartão: começa no lugar e no tamanho dele e cresce até o centro da tela
  var doCartao = function () {
    if (!pastaOrigem) return "scale(.92)";
    var c = pastaOrigem.getBoundingClientRect();
    var p = painel.getBoundingClientRect();
    return "translate(" + (c.left - p.left) + "px," + (c.top - p.top) + "px) scale(" + (c.width / p.width) + "," + (c.height / p.height) + ")";
  };

  var abrirPasta = function (slug, botao) {
    var dados = (window.PASTAS || {})[slug];
    if (!dados || !pasta) return;
    pastaOrigem = botao || null;
    montarPasta(dados, botao);
    pasta.hidden = false;
    document.body.classList.add("sem-rolagem");
    $(".pasta-conteudo", pasta).scrollTop = 0;
    painel.style.transition = "none";
    painel.style.transform = "none";
    painel.style.transform = doCartao();
    void painel.offsetWidth;            // aplica o ponto de partida antes de animar
    painel.style.transition = "";
    pasta.classList.add("is-open");
    painel.style.transform = "none";
    $(".pasta-fechar", pasta).focus({ preventScroll: true });
  };

  var fecharPasta = function () {
    if (!pastaAberta() || !pasta.classList.contains("is-open")) return;
    pararVideos();
    painel.style.transform = "none";
    var destino = doCartao();
    pasta.classList.remove("is-open");
    painel.style.transform = destino;
    var fim = function () {
      pasta.hidden = true;
      painel.style.transform = "";
      $$("video", pasta).forEach(function (v) { v.removeAttribute("src"); v.load(); });
      document.body.classList.remove("sem-rolagem");
      if (pastaOrigem) pastaOrigem.focus({ preventScroll: true });
    };
    window.setTimeout(fim, 420);
  };

  if (pasta) {
    $$("[data-pasta]").forEach(function (btn) {
      btn.addEventListener("click", function () { abrirPasta(btn.dataset.pasta, btn); });
    });
    $(".pasta-fechar", pasta).addEventListener("click", fecharPasta);
    pasta.addEventListener("click", function (e) { if (e.target === pasta) fecharPasta(); });
    document.addEventListener("keydown", function (e) {
      if (!pastaAberta() || !lb.hidden) return;   // com a foto ampliada, as teclas são da galeria
      if (e.key === "Escape") fecharPasta();
      else if (e.key === "Tab") {
        var focaveis = $$("button, video", pasta);
        var primeiro = focaveis[0];
        var ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
      }
    });
  }

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

  // "qual" é o nome de uma galeria de window.GALERIAS ou um objeto { titulo, fotos }
  var abrirGaleria = function (qual, botao, inicio) {
    galeria = typeof qual === "string" ? (window.GALERIAS || {})[qual] : qual;
    if (!galeria || !galeria.fotos.length) return;
    origem = botao || null;
    lb.hidden = false;
    document.body.classList.add("sem-rolagem");
    var unica = galeria.fotos.length < 2;
    $(".lb-ant", lb).hidden = unica;
    $(".lb-prox", lb).hidden = unica;
    mostrarFoto(inicio || 0);
    $(".lb-fechar", lb).focus();
  };

  var fecharGaleria = function () {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    // se a galeria foi aberta de dentro de uma pasta, a página continua travada atrás dela
    if (!pastaAberta()) document.body.classList.remove("sem-rolagem");
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
