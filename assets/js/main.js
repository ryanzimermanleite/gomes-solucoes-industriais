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

  /* ---------- blog: Gomes Jornal (uma notícia por página; clicar ou arrastar vira a página) ---------- */
  var palco = $("#gj-palco");
  if (palco) {
    var paginas = $$(".gj-pagina", palco);
    var temas = $$(".gj-tema");
    var setasJornal = $$(".gj-seta");
    var atual = 0;
    var virada = null;       // a virada em andamento
    var arrastouJornal = false;

    // data de hoje no cabeçalho; a primeira página (a mais recente) vira "Notícia do dia" se foi publicada hoje
    var agora = new Date();
    var dataJornal = $("#gj-data");
    if (dataJornal) {
      dataJornal.textContent = "Campinas · " + agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    var doisDigitos = function (n) { return (n < 10 ? "0" : "") + n; };
    var hojeIso = agora.getFullYear() + "-" + doisDigitos(agora.getMonth() + 1) + "-" + doisDigitos(agora.getDate());
    var selo = paginas.length ? $(".gj-selo", paginas[0]) : null;
    if (selo && paginas[0].dataset.data === hojeIso) selo.textContent = "Notícia do dia";

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

    /* Geometria da dobra. A linha da dobra passa por (f, meio da altura) e inclina "t" (tangente do ângulo):
       à esquerda dela fica o que ainda se vê da página de cima; à direita aparece a página de baixo;
       a aba é a parte da direita espelhada na linha, ou seja, o verso da folha enrolando. */
    var ladoDaDobra = function (pts, lado, f, t, yc) {
      var dist = function (p) { return lado * (p[0] - (f + (p[1] - yc) * t)); };
      var res = [];
      pts.forEach(function (a, i) {
        var b = pts[(i + 1) % pts.length];
        var da = dist(a), db = dist(b);
        if (da >= 0) res.push(a);
        if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
          var k = da / (da - db);
          res.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
        }
      });
      return res;
    };
    var poligono = function (pts) {
      if (pts.length < 3) return "polygon(0 0, 0 0, 0 0)";
      return "polygon(" + pts.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(",") + ")";
    };
    var recorte = function (el, valor) { el.style.webkitClipPath = valor; el.style.clipPath = valor; };

    var INCLINACAO = 0.3;   // radianos no meio da virada: é o que faz a folha sair pelo canto

    // p = 0 mostra a página x inteira; p = 1 mostra a y inteira
    var desenhar = function (p) {
      var v = virada;
      v.p = p;
      var W = palco.clientWidth, H = palco.clientHeight, yc = H / 2;
      var inclinacao = Math.min(INCLINACAO, Math.atan(W * 0.3 / yc));   // página alta (celular) inclina menos
      var ang = v.canto * inclinacao * Math.sin(Math.PI * p);
      var t = Math.tan(ang);
      var folga = yc * Math.tan(inclinacao);
      var f = (W + folga) - p * (W + 2 * folga);
      var folhaToda = [[0, 0], [W, 0], [W, H], [0, H]];
      var esq = ladoDaDobra(folhaToda, -1, f, t, yc);
      var dir = ladoDaDobra(folhaToda, 1, f, t, yc);
      var ux = t / Math.sqrt(1 + t * t), uy = 1 / Math.sqrt(1 + t * t);
      var aba = dir.map(function (q) {
        var dx = q[0] - f, dy = q[1] - yc;
        var k = 2 * (dx * ux + dy * uy);
        return [f + k * ux - dx, yc + k * uy - dy];
      });
      recorte(paginas[v.x], poligono(esq));
      recorte(v.sombra, poligono(dir));
      recorte(v.aba, poligono(aba));
      var largura = Math.max(0, Math.min(W, W - f + folga));
      var giro = "rotate(" + (-ang) + "rad)";
      var luz = v.luz.style, sob = v.sob.style;
      luz.left = (f - largura) + "px"; luz.width = largura + "px";
      luz.top = (yc - 1.5 * H) + "px"; luz.height = (3 * H) + "px";
      luz.transformOrigin = "100% 50%"; luz.transform = giro;
      sob.left = f + "px"; sob.width = Math.min(largura * 0.55 + 12, 170) + "px";
      sob.top = luz.top; sob.height = luz.height;
      sob.transformOrigin = "0 50%"; sob.transform = giro;
    };

    var montarVirada = function (a, b, canto) {
      var x = Math.min(a, b), y = Math.max(a, b);
      var cena = criar("div", "gj-vira");
      var sombra = criar("div", "gj-sombra");
      var caixa = criar("div", "gj-aba-caixa");
      var aba = criar("div", "gj-aba");
      var sob = criar("i"), luz = criar("i");
      sombra.appendChild(sob);
      aba.appendChild(luz);
      caixa.appendChild(aba);
      cena.appendChild(sombra);
      cena.appendChild(caixa);
      cena.setAttribute("aria-hidden", "true");
      palco.appendChild(cena);
      paginas[x].classList.add("gj-cima");
      paginas[y].classList.add("gj-baixo");
      virada = { x: x, y: y, de: a, para: b, canto: canto || -1, cena: cena, sombra: sombra, aba: aba, sob: sob, luz: luz, p: 0 };
      desenhar(a === x ? 0 : 1);
    };

    var encerrar = function (chegou) {
      var v = virada;
      if (chegou) atual = v.para;
      recorte(paginas[v.x], "");
      paginas[v.x].classList.remove("gj-cima");
      paginas[v.y].classList.remove("gj-baixo");
      palco.removeChild(v.cena);
      virada = null;
      marcar();
      // se a pessoa estava no meio de um texto comprido (celular), a notícia nova começa do título
      if (chegou && palco.getBoundingClientRect().top < 0) {
        $("#jornal").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // leva a folha até o fim (chegou = true) ou de volta ao começo (desistiu de virar)
    var soltarFolha = function (chegou) {
      var v = virada;
      var destino = (chegou ? v.para : v.de) === v.x ? 0 : 1;
      var origem = v.p;
      var duracao = 220 + 880 * Math.abs(destino - origem);
      var inicio = null;
      v.animando = true;
      var quadro = function (tempo) {
        if (virada !== v) return;
        if (inicio === null) inicio = tempo;
        var k = Math.min(1, (tempo - inicio) / duracao);
        var suave = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        desenhar(origem + (destino - origem) * suave);
        if (k < 1) requestAnimationFrame(quadro); else encerrar(chegou);
      };
      requestAnimationFrame(quadro);
    };

    var irParaPagina = function (alvo, canto) {
      if (virada || alvo === atual || alvo < 0 || alvo >= paginas.length) return;
      montarVirada(atual, alvo, canto);
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
      var caixa = palco.getBoundingClientRect();
      // puxou pela metade de cima: a folha sai pelo canto de cima; pela de baixo, sai pelo de baixo
      var naTela = Math.max(caixa.top, 0) + (Math.min(caixa.bottom, window.innerHeight) - Math.max(caixa.top, 0)) / 2;
      puxao = { x: e.clientX, y: e.clientY, id: e.pointerId, canto: e.clientY < naTela ? 1 : -1 };
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
        montarVirada(atual, alvo, puxao.canto);
      }
      var andou = Math.max(0, Math.min(1, (dx * puxao.sentido) / (palco.clientWidth * 0.75)));
      puxao.andou = andou;
      desenhar(virada.de === virada.x ? andou : 1 - andou);
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

    // clique simples fora de um link vira para a próxima notícia (da última, volta para a primeira)
    palco.addEventListener("click", function (e) {
      if (arrastouJornal) { e.preventDefault(); e.stopPropagation(); arrastouJornal = false; return; }
      if (e.target.closest("a, button")) return;
      if (String(window.getSelection && window.getSelection()) !== "") return;   // estava selecionando texto
      irParaPagina(atual + 1 < paginas.length ? atual + 1 : 0);
    }, true);
    window.addEventListener("resize", function () { if (virada) desenhar(virada.p); });

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
