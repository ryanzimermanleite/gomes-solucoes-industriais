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
    if (dados.logo) $("#pasta-logo").src = dados.logo;
    $("#pasta-nome").textContent = dados.nome;
    $("#pasta-local").textContent = dados.local;
    $("#pasta-titulo").textContent = dados.titulo;
    $("#pasta-descricao").textContent = dados.descricao || "";
    $("#pasta-descricao").hidden = !dados.descricao;

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

    // fotos: um bloco por serviço. Quem tem um serviço só mostra um bloco "Fotos".
    // Um bloco pode trazer a lista "fotos" ou apontar para uma galeria de window.GALERIAS
    // (aí a miniatura é o mesmo arquivo terminado em "-p.webp").
    var fotosDe = function (bloco) {
      if (bloco.fotos) return bloco.fotos;
      return (((window.GALERIAS || {})[bloco.galeria] || {}).fotos || []).map(function (f) {
        return { src: f.src, w: f.w, h: f.h, p: f.src.replace(/\.webp$/, "-p.webp") };
      });
    };
    var blocos = dados.servicos || [dados];
    var area = $("#pasta-fotos");
    area.textContent = "";
    blocos.forEach(function (bloco) {
      var lista = fotosDe(bloco);
      if (!lista.length) return;
      var album = { titulo: bloco.titulo + " — " + bloco.local, fotos: lista };
      area.appendChild(criar("h3", "pasta-sub", dados.servicos ? bloco.titulo : "Fotos"));
      if (dados.servicos) area.appendChild(criar("p", "pasta-sub-local", bloco.local + " · " + lista.length + " fotos"));
      var grade = criar("div", "pasta-grade");
      lista.forEach(function (f, i) {
        var b = criar("button", "pasta-foto");
        b.type = "button";
        b.setAttribute("aria-label", bloco.titulo + ": ampliar foto " + (i + 1) + " de " + lista.length);
        var img = criar("img");
        img.src = f.p || f.src;
        img.alt = "";
        img.loading = "lazy";
        b.appendChild(img);
        b.addEventListener("click", function () { abrirGaleria(album, b, i); });
        grade.appendChild(b);
      });
      area.appendChild(grade);
    });
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

  /* ---------- nosso trabalho: carrossel (uma linha só; passa sozinho ou arrastando) ---------- */
  var trilho = $(".acervo");
  if (trilho) {
    var slides = $$(".pasta-card", trilho);
    var setas = $$("[data-acervo]");
    var arrastou = false;
    var pausado = false;
    var naTela = false;

    var passoSlide = function () {
      return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : trilho.clientWidth;
    };
    var fimDoTrilho = function () { return trilho.scrollWidth - trilho.clientWidth; };
    var irPara = function (x) {
      trilho.scrollTo({ left: Math.max(0, Math.min(fimDoTrilho(), x)), behavior: "smooth" });
    };
    var andar = function (dir) {
      var passo = passoSlide();
      var atual = Math.round(trilho.scrollLeft / passo);
      irPara((atual + dir) * passo);
    };
    var atualizarSetas = function () {
      setas.forEach(function (b) {
        var dir = Number(b.dataset.acervo);
        b.disabled = dir < 0 ? trilho.scrollLeft < 4 : trilho.scrollLeft > fimDoTrilho() - 4;
      });
    };
    setas.forEach(function (b) {
      b.addEventListener("click", function () { andar(Number(b.dataset.acervo)); });
    });
    trilho.addEventListener("scroll", atualizarSetas, { passive: true });
    window.addEventListener("resize", atualizarSetas);
    atualizarSetas();

    // arrastar com o mouse (no celular o dedo já rola o trilho sozinho)
    var arrasto = null;
    trilho.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      arrasto = { x: e.clientX, inicio: trilho.scrollLeft };
      arrastou = false;
    });
    window.addEventListener("pointermove", function (e) {
      if (!arrasto) return;
      var dx = e.clientX - arrasto.x;
      if (!arrastou && Math.abs(dx) < 6) return;
      if (!arrastou) { arrastou = true; trilho.classList.add("is-arrastando"); }
      trilho.scrollLeft = arrasto.inicio - dx;
    });
    var soltar = function () {
      if (!arrasto) return;
      arrasto = null;
      if (!arrastou) return;
      var passo = passoSlide();
      irPara(Math.round(trilho.scrollLeft / passo) * passo);
      window.setTimeout(function () { trilho.classList.remove("is-arrastando"); }, 450);
    };
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    // depois de arrastar, o clique que sobra não pode abrir a pasta
    trilho.addEventListener("click", function (e) {
      if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; }
    }, true);
    trilho.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // passa sozinho; para com o mouse em cima, com o foco dentro, com uma pasta aberta ou fora da tela
    ["pointerenter", "focusin", "touchstart"].forEach(function (ev) {
      trilho.addEventListener(ev, function () { pausado = true; }, { passive: true });
    });
    ["pointerleave", "focusout", "touchend"].forEach(function (ev) {
      trilho.addEventListener(ev, function () { pausado = false; }, { passive: true });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { naTela = entries[0].isIntersecting; }, { threshold: 0.5 }).observe(trilho);
    } else {
      naTela = true;
    }
    window.setInterval(function () {
      if (pausado || arrasto || !naTela || document.hidden || pastaAberta()) return;
      if (trilho.scrollLeft > fimDoTrilho() - 4) irPara(0); else andar(1);
    }, 4000);
  }

  /* ---------- blog: Gomes Jornal (uma página por tema; clicar ou arrastar vira a página) ---------- */
  var palco = $("#gj-palco");
  if (palco) {
    var paginas = $$(".gj-pagina", palco);
    var temas = $$(".gj-tema");
    var setasJornal = $$(".gj-seta");
    var atual = 0;
    var virada = null;       // a virada em andamento: { x, y, v, cena, folha, ang }
    var arrastouJornal = false;

    var dataJornal = $("#gj-data");
    if (dataJornal) {
      var hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      dataJornal.textContent = "Campinas · " + hoje;
    }

    var marcar = function () {
      paginas.forEach(function (p, i) { p.classList.toggle("is-atual", i === atual); });
      temas.forEach(function (t, i) {
        t.classList.toggle("is-ativo", i === atual);
        t.setAttribute("aria-selected", String(i === atual));
      });
      setasJornal.forEach(function (b) {
        var alvo = atual + Number(b.dataset.passo);
        b.disabled = alvo < 0 || alvo >= paginas.length;
      });
    };

    // metade de uma página: uma cópia dela dentro de uma janela que mostra só um lado
    var metade = function (classe, pagina) {
      var caixa = criar("div", classe);
      var copia = pagina.cloneNode(true);
      copia.className = "gj-pagina gj-clone";
      copia.removeAttribute("aria-label");
      caixa.setAttribute("aria-hidden", "true");
      caixa.appendChild(copia);
      return caixa;
    };

    // Entre a página x (antes) e a y (depois): ângulo 0 mostra x inteira e ângulo "fim" mostra y inteira.
    // Embaixo ficam a 1ª metade de x e a 2ª de y; a folha que vira tem a 2ª metade de x na frente e a 1ª de y no verso.
    var montarVirada = function (a, b) {
      var x = Math.min(a, b), y = Math.max(a, b);
      var v = window.matchMedia("(max-width: 680px)").matches;   // no celular a dobra é vertical
      var cena = criar("div", "gj-vira " + (v ? "is-v" : "is-h"));
      var folha = criar("div", "gj-folha");
      cena.appendChild(metade("gj-metade gj-esq", paginas[x]));
      cena.appendChild(metade("gj-metade gj-dir", paginas[y]));
      folha.appendChild(metade("gj-face gj-frente", paginas[x]));
      folha.appendChild(metade("gj-face gj-verso", paginas[y]));
      cena.appendChild(folha);
      palco.appendChild(cena);
      palco.classList.add("is-virando");
      virada = { x: x, y: y, v: v, cena: cena, folha: folha, fim: v ? 180 : -180, ang: 0, de: a, para: b };
      girar(a === x ? 0 : virada.fim);
    };

    var girar = function (ang) {
      virada.ang = ang;
      virada.folha.style.transform = (virada.v ? "rotateX(" : "rotateY(") + ang + "deg)";
      virada.cena.style.setProperty("--p", String(Math.abs(ang) / 180));
    };

    var encerrar = function (chegou) {
      if (chegou) atual = virada.para;
      palco.removeChild(virada.cena);
      palco.classList.remove("is-virando");
      virada = null;
      marcar();
    };

    // leva a folha até o fim (chegou = true) ou de volta ao começo (desistiu de virar)
    var soltarFolha = function (chegou) {
      var v = virada;
      var destino = (chegou ? v.para : v.de) === v.x ? 0 : v.fim;
      var origem = v.ang;
      var duracao = 150 + 550 * Math.abs(destino - origem) / 180;
      var inicio = null;
      v.animando = true;
      var quadro = function (agora) {
        if (virada !== v) return;
        if (inicio === null) inicio = agora;
        var t = Math.min(1, (agora - inicio) / duracao);
        var suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        girar(origem + (destino - origem) * suave);
        if (t < 1) requestAnimationFrame(quadro); else encerrar(chegou);
      };
      requestAnimationFrame(quadro);
    };

    var irParaPagina = function (alvo) {
      if (virada || alvo === atual || alvo < 0 || alvo >= paginas.length) return;
      montarVirada(atual, alvo);
      soltarFolha(true);
    };

    temas.forEach(function (t) {
      t.addEventListener("click", function () { irParaPagina(Number(t.dataset.ir)); });
    });
    setasJornal.forEach(function (b) {
      b.addEventListener("click", function () { irParaPagina(atual + Number(b.dataset.passo)); });
    });

    // arrastar: a folha acompanha o dedo ou o mouse; soltar depois de 1/4 do caminho completa a virada
    var puxao = null;
    palco.addEventListener("pointerdown", function (e) {
      if (virada || (e.pointerType === "mouse" && e.button !== 0)) return;
      puxao = { x: e.clientX, y: e.clientY, id: e.pointerId };
      arrastouJornal = false;
    });
    palco.addEventListener("pointermove", function (e) {
      if (!puxao || e.pointerId !== puxao.id) return;
      var dx = e.clientX - puxao.x, dy = e.clientY - puxao.y;
      if (!puxao.ativo) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        var alvo = atual + (dx < 0 ? 1 : -1);
        if (alvo < 0 || alvo >= paginas.length) { puxao = null; return; }
        puxao.ativo = true;
        puxao.sentido = dx < 0 ? -1 : 1;
        arrastouJornal = true;
        try { palco.setPointerCapture(e.pointerId); } catch (erro) { /* sem captura, segue pelo movimento */ }
        palco.classList.add("is-arrastando");
        montarVirada(atual, alvo);
      }
      var andou = Math.max(0, Math.min(1, (dx * puxao.sentido) / (palco.clientWidth * 0.5)));
      puxao.andou = andou;
      var doComeco = virada.de === virada.x ? 0 : virada.fim;
      var aoFim = virada.para === virada.x ? 0 : virada.fim;
      girar(doComeco + (aoFim - doComeco) * andou);
    });
    var largar = function (e) {
      if (!puxao || (e && e.pointerId !== puxao.id)) return;
      var p = puxao;
      puxao = null;
      palco.classList.remove("is-arrastando");
      if (p.ativo && virada && !virada.animando) soltarFolha((p.andou || 0) > 0.25);
    };
    palco.addEventListener("pointerup", largar);
    palco.addEventListener("pointercancel", largar);

    // clique simples fora de um link vira para a próxima página (da última, volta para a primeira)
    palco.addEventListener("click", function (e) {
      if (arrastouJornal) { e.preventDefault(); e.stopPropagation(); arrastouJornal = false; return; }
      if (e.target.closest("a, button")) return;
      irParaPagina(atual + 1 < paginas.length ? atual + 1 : 0);
    }, true);
    palco.addEventListener("dragstart", function (e) { e.preventDefault(); });

    marcar();
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
