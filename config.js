const axios = require("axios");
const cookie = require("cookie");
const FormData = require("form-data");
const cheerio = require("cheerio");
const request = require('request');
const yts = require("yt-search")
const qs = require("qs")
const fs = require('fs-extra')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))
const encodeUrl = require('encodeurl');
const linkfy = require('linkifyjs')
const randomIntFromInterval = (min, max) => {
return Math.floor(Math.random() * (max - min + 1) + min)
const removerAcentos = (s) => typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
const useragent_1 = {
  "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
};
const got = require('got')
// Definindo a rota com Router.get
// Variáveis de ambiente para as credenciais do Spotify
process.env['SPOTIFY_CLIENT_ID'] = '4c4fc8c3496243cbba99b39826e2841f';
process.env['SPOTIFY_CLIENT_SECRET'] = 'd598f89aba0946e2b85fb8aefa9ae4c8';

// Função para converter milissegundos em minutos:segundos
async function convert(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// Função para obter credenciais do Spotify
async function spotifyCreds() {
    return new Promise(async resolve => {
        try {
            const json = await (await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
                headers: {
                    Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
                }
            })).data;
            if (!json.access_token) return resolve({
                status: false,
                msg: 'Não foi possível gerar o token!'
            });
            resolve({
                status: true,
                data: json
            });
        } catch (e) {
            resolve({
                status: false,
                msg: e.message
            });
        }
    });
}
async function photooxy(url, text) {
    // Faz uma requisição GET para obter o token
    const geturl = await fetch(url, {
        method: "GET",
        headers: {
            "User-Agent": "GoogleBot",
        },
    });

    const caritoken = await geturl.text();
    let hasilcookie = geturl.headers
        .get("set-cookie")
        .split(",")
        .map((v) => cookie.parse(v))
        .reduce((a, c) => {
            return { ...a, ...c };
        }, {});

    // Extrai os cookies necessários
    hasilcookie = {
        __cfduid: hasilcookie.__cfduid,
        PHPSESSID: hasilcookie.PHPSESSID,
    };

    hasilcookie = Object.entries(hasilcookie)
        .map(([name, value]) => cookie.serialize(name, value))
        .join("; ");

    const $ = cheerio.load(caritoken);
    const token = $('input[name="token"]').attr("value");
    const form = new FormData();

    // Adiciona o texto ao formulário
    if (typeof text === "string") text = [text];
    for (let texts of text) form.append("text[]", texts);
    form.append("submit", "Go");
    form.append("token", token);
    form.append("build_server", "https://e2.yotools.net");
    form.append("build_server_id", 2);

    // Faz uma requisição POST para gerar a imagem
    const geturl2 = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "GoogleBot",
            Cookie: hasilcookie,
            ...form.getHeaders(),
        },
        body: form.getBuffer(),
    });

    const caritoken2 = await geturl2.text();
    const $$ = cheerio.load(caritoken2);
    const token2 = $$("#form_value").text();

    if (!token2) throw new Error("Token Não Encontrado!");

    const prosesimage = await post(
        "https://photooxy.com/effect/create-image",
        JSON.parse(token2),
        hasilcookie
    );

    const hasil = await prosesimage.json();

    // Retorna a URL da imagem
    if (hasil.success && hasil.image) {
        return {
            image: `https://e2.yotools.net/${hasil.image}` // Retorna a URL da imagem
        };
    } else {
        throw new Error("Falha ao gerar a imagem.");
    }
}

// Função de postagem auxiliar
async function post(url, formdata = {}, cookies) {
    let encode = encodeURIComponent;
    let body = Object.keys(formdata)
        .map((key) => {
            let vals = formdata[key];
            let isArray = Array.isArray(vals);
            let keys = encode(key + (isArray ? "[]" : ""));
            if (!isArray) vals = [vals];
            let out = [];
            for (let valq of vals) out.push(keys + "=" + encode(valq));
            return out.join("&");
        })
        .join("&");

    return await fetch(`${url}?${body}`, {
        method: "GET",
        headers: {
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "GoogleBot",
            Cookie: cookies,
        },
    });
	    }
// Função para buscar músicas pelo nome
async function searching(query, type = 'track', limit = 20) {
    return new Promise(async resolve => {
        try {
            const creds = await spotifyCreds();
            if (!creds.status) return resolve(creds);
            const json = await (await axios.get(`https://api.spotify.com/v1/search?query=${query}&type=${type}&offset=0&limit=${limit}`, {
                headers: {
                    Authorization: 'Bearer ' + creds.data.access_token
                }
            })).data;
            if (!json.tracks.items || json.tracks.items.length < 1) return resolve({
                status: false,
                msg: 'Música não encontrada!'
            });
            let data = [];
            json.tracks.items.map(v => data.push({
                title: v.album.artists[0].name + ' - ' + v.name,
                duration: convert(v.duration_ms),
                popularity: v.popularity + '%',
                preview: v.preview_url,
                url: v.external_urls.spotify
            }));
            resolve({
                status: true,
                data
            });
        } catch (e) {
            resolve({
                status: false,
                msg: e.message
            });
        }
    });
}

// Função para baixar música do Spotify
async function spotifydl(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const yanzz = await axios.get(`https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`);
            const yanz = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${yanzz.data.result.gid}/${yanzz.data.result.id}`);
            const result = {
                title: yanzz.data.result.name,
                type: yanzz.data.result.type,
                artis: yanzz.data.result.artists,
                durasi: yanzz.data.result.duration_ms,
                image: yanzz.data.result.image,
                download: "https://api.fabdl.com" + yanz.data.result.download_url
            };
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}
module.exports = snapsave = (url) => {
  return new Promise(async (resolve) => {
    try {
      if (!url.match(/(?:https?:\/\/(web\.|www\.|m\.)?(facebook|fb)\.(com|watch)\S+)?$/) && !url.match(/(https|http):\/\/www.instagram.com\/(p|reel|tv|stories)/gi)) return resolve({ developer: '@Alia Uhuy', status: false, msg: `Link Url not valid` })
      function decodeSnapApp(args) {
        let [h, u, n, t, e, r] = args
        // @ts-ignore
        function decode(d, e, f) {
          const g = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('')
          let h = g.slice(0, e)
          let i = g.slice(0, f)
          // @ts-ignore
          let j = d.split('').reverse().reduce(function (a, b, c) {
            if (h.indexOf(b) !== -1)
              return a += h.indexOf(b) * (Math.pow(e, c))
          }, 0)
          let k = ''
          while (j > 0) {
            k = i[j % f] + k
            j = (j - (j % f)) / f
          }
          return k || '0'
        }
        r = ''
        for (let i = 0, len = h.length; i < len; i++) {
          let s = ""
          // @ts-ignore
          while (h[i] !== n[e]) {
            s += h[i]; i++
          }
          for (let j = 0; j < n.length; j++)
            s = s.replace(new RegExp(n[j], "g"), j.toString())
          // @ts-ignore
          r += String.fromCharCode(decode(s, e, 10) - t)
        }
        return decodeURIComponent(encodeURIComponent(r))
      }
      function getEncodedSnapApp(data) {
        return data.split('decodeURIComponent(escape(r))}(')[1]
          .split('))')[0]
          .split(',')
          .map(v => v.replace(/"/g, '').trim())
      }
      function getDecodedSnapSave(data) {
        return data.split('getElementById("download-section").innerHTML = "')[1]
          .split('"; document.getElementById("inputData").remove(); ')[0]
          .replace(/\\(\\)?/g, '')
      }
      function decryptSnapSave(data) {
        return getDecodedSnapSave(decodeSnapApp(getEncodedSnapApp(data)))
      }
      const html = await got.post('https://snapsave.app/action.php?lang=id', {
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'content-type': 'application/x-www-form-urlencoded', 'origin': 'https://snapsave.app',
          'referer': 'https://snapsave.app/id',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        },
        form: { url }
      }).text()
      const decode = decryptSnapSave(html)
      const $ = cheerio.load(decode)
      const results = []
      if ($('table.table').length || $('article.media > figure').length) {
        const thumbnail = $('article.media > figure').find('img').attr('src')
        $('tbody > tr').each((_, el) => {
          const $el = $(el)
          const $td = $el.find('td')
          const resolution = $td.eq(0).text()
          let _url = $td.eq(2).find('a').attr('href') || $td.eq(2).find('button').attr('onclick')
          const shouldRender = /get_progressApi/ig.test(_url || '')
          if (shouldRender) {
            _url = /get_progressApi\('(.*?)'\)/.exec(_url || '')?.[1] || _url
          }
          results.push({
            resolution,
            thumbnail,
            url: _url,
            shouldRender
          })
        })
      } else {
        $('div.download-items__thumb').each((_, tod) => {
          const thumbnail = $(tod).find('img').attr('src')
          $('div.download-items__btn').each((_, ol) => {
            let _url = $(ol).find('a').attr('href')
            if (!/https?:\/\//.test(_url || '')) _url = `https://snapsave.app${_url}`
            results.push({
              thumbnail,
              url: _url
            })
          })
        })
      }
      if (!results.length) return resolve({ developer: '@Alia Uhuy', status: false, msg: `Blank data` })
      return resolve({ developer: '@Alia Uhuy', status: true, data: results })
    } catch (e) {
      return resolve({ developer: '@Alia Uhuy', status: false, msg: e.message })
    }
  })
		    }
function decodeHtmlEntities(text) {
  const htmlEntitiesMap = {
    '&period;': '.',
    '&quest;': '?',
    '&colon;': ':',
    '&comma;': ',',
    '&excl;': '!',
    '&apos;': '\'',
    '&quot;': '"',
    '&amp;': '&'
  };

  return text.replace(/&period;|&quest;|&colon;|&comma;|&excl;|&apos;|&quot;|&amp;/g, (match) => htmlEntitiesMap[match]);
}

// Função para formatar a data
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('pt-BR');
}

// Função para formatar a duração
function formatDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1], 10) || 0;
  const minutes = parseInt(match[2], 10) || 0;
  const seconds = parseInt(match[3], 10) || 0;
  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes.toFixed(2) + ' minutos';
}

function LetradaMusica(musica){
	return new Promise(async(resolve, reject) => {
   		axios.get('https://www.musixmatch.com/search?query=' + encodeURIComponent(musica))
   		.then(async({ data }) => {
   			const $ = cheerio.load(data);
   			const resultado = {};
   			const limk = 'https://www.musixmatch.com';
   			const link = limk + $('div.media-card-body > div > h2').find('a').attr('href');
	   		await axios.get(link)
	   		.then(({ data }) => {
		   		const $$ = cheerio.load(data);
		   		resultado.ImagemMusic = 'https:' + $$('div.col-sm-1.col-md-2.col-ml-3.col-lg-3.static-position > div > div > div').find('img').attr('src');
		  		$$('div.col-sm-10.col-md-8.col-ml-6.col-lg-6 > div.mxm-lyrics').each(function(a,b) {
		  			resultado.LetraDaMusica = $$(b).find('span > p > span').text() +'\n' + $$(b).find('span > div > p > span').text();
		  		});
	  	})
	  	resolve(resultado);
  	})
  	.catch(reject);
	});
}

async function XvideosDL(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const scriptContent = $('script[type="application/ld+json"]').html();
    const videoData = JSON.parse(scriptContent);
    const formattedData = {
      name: decodeHtmlEntities(videoData.name),
      description: decodeHtmlEntities(videoData.description),
      thumbnail: videoData.thumbnailUrl,
      uploadDate: formatDate(videoData.uploadDate),
      duration: formatDuration(videoData.duration),
      videoUrl: videoData.contentUrl
    };
    return formattedData;
  } catch (error) {
    console.error('Erro no scrapping de dados:', error);
    return null; //caso dê erro vai retornar null/vazio
  }
}

async function XvideosSearch(termo) {
  const urlBase = "https://www.xvideos.com";
  const searchTerm = termo.split(' ').join('+');
  const url = `${urlBase}?k=${searchTerm}`;
  try {
   const { data } = await axios.get(url);
   const $ = cheerio.load(data);
   const videos = [];
   $(".mozaique .thumb-block").each((i, elem) => {
      const title = $(elem).find('.title a').attr('title');
      const profile = $(elem).find('.profile-name a .name').text();
      const duration = $(elem).find('.duration').first().text().trim();
      const views = $(elem).find('.metadata .views').text().trim().split(' ')[0];
      const videoLink = urlBase + $(elem).find('.title a').attr('href');
      videos.push({title, profile, duration, views, link: videoLink});
    });
    return videos
  } catch (error) {
    console.error('Erro na pesquisa do Xvideos:', error);
    return null;
  }
}

async function XnxxDL(URL) {
  return new Promise((resolve, reject) => {
    fetch(`${URL}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = $('meta[property="og:title"]').attr('content');
      const duration = $('meta[property="og:duration"]').attr('content');
      const image = $('meta[property="og:image"]').attr('content');
      const videoType = $('meta[property="og:video:type"]').attr('content');
      const videoWidth = $('meta[property="og:video:width"]').attr('content');
      const videoHeight = $('meta[property="og:video:height"]').attr('content');
      const info = $('span.metadata').text();
      const videoScript = $('#video-player-bg > script:nth-child(6)').html();
      const files = {
        low: (videoScript.match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],
        high: videoScript.match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);' || [])[1],
        HLS: videoScript.match('html5player.setVideoHLS\\(\'(.*?)\'\\);' || [])[1],
        thumb: videoScript.match('html5player.setThumbUrl\\(\'(.*?)\'\\);' || [])[1],
        thumb69: videoScript.match('html5player.setThumbUrl169\\(\'(.*?)\'\\);' || [])[1],
        thumbSlide: videoScript.match('html5player.setThumbSlide\\(\'(.*?)\'\\);' || [])[1],
        thumbSlideBig: videoScript.match('html5player.setThumbSlideBig\\(\'(.*?)\'\\);' || [])[1]};
      resolve({title, URL, duration, image, videoType, videoWidth, videoHeight, info, files});
    }).catch((err) => reject({code: 503, error: err}));
  });
};

async function XnxxSearch(query) {
  return new Promise((resolve, reject) => {
    const baseurl = 'https://www.xnxx.com';
    fetch(`${baseurl}/search/${query}/${Math.floor(Math.random() * 3) + 1}`, {method: 'get'}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = [];
      const url = [];
      const desc = [];
      const results = [];
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb').each(function(c, d) {
          url.push(baseurl + $(d).find('a').attr('href').replace('/THUMBNUM/', '/'));
        });
      });
      $('div.mozaique').each(function(a, b) {
        $(b).find('div.thumb-under').each(function(c, d) {
          desc.push($(d).find('p.metadata').text());
          $(d).find('a').each(function(e, f) {
            title.push($(f).attr('title'));
          });
        });
      });
      for (let i = 0; i < title.length; i++) {
        results.push({title: title[i], info: desc[i], link: url[i]});
      }
      resolve(results);
    }).catch((err) => reject({code: 503, status: false, result: err}));
  });
};

async function dicionarioNome(nome) {
    try {
        const url = `https://www.dicionariodenomesproprios.com.br/${encodeURIComponent(nome)}`;
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        // Verificar se a página existe
        const pageTitle = $('.content-title.mt-20-md').text();
        if (pageTitle.includes('Página Não Encontrada') || $('.content-main.content-main--corp').length) {
            return 'Nome não encontrado no dicionário.';
        }
        const imageUrl = $('.content-img').attr('src');
        const significado = $('#significado').text().trim();
        const origem = $('#origem a').text().trim();
        const nomesRelacionados = $('.nomes-relacionados li').map((i, el) => $(el).text().trim()).get().join(', ');
        const locaisComNome = $('.origem-related').first().text().trim();
        const genero = $('.origem-related').eq(1).text().trim().split('\n')[0];
        const derivacoes = $('.origem-related').last().find('a').text().trim();
            return {imageUrl, significado, origem, nomesRelacionados, locaisComNome, genero, derivacoes};
    } catch (error) {
        return 'Nome não encontrado ou erro no scrapping de dados';
    }
}

async function rastrearEncomendas(id) {
  try {
    const url = `https://www.muambator.com.br/pacotes/${id}/detalhes/`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const milestones = [];
    $('.milestones li').each((i, element) => {
        const timeCount = $(element).find('small').text().trim() || "Sem informação do tempo que o objeto foi postado no Correios...";
        const datePost = $(element).find('.out').text().trim() || "Ocorreu um erro ao raspar a data e horário de postagem";
        const description = $(element).find('strong').text().trim() || "Sem descrição do local aonde foi realizada a postagem.";        
            milestones.push({datePost, description, timeCount});
    });
    return milestones;
  } catch (error) {
    console.error("Erro ao raspar informações de rastreamento:", error);
    return {message: "Ouve um erro ao raspar informações sobre o rastreamento do pedido"};
  }
}


function xvideosPorno(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://xvideosporno.blog.br/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.postbox").each((_, say) => {
    var titulo = $(say).find("a").attr('title');
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('src');
    var duração = $(say).find("time.duration-top").text().trim();
    var qualidade = $(say).find("b.hd-top").text().trim();
    postagem.push({titulo: titulo, img: img, duração: duração, qualidade: qualidade, link: link});
  })
    resolve(postagem)
  }).catch(reject)
  });
}

async function pensador(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://www.pensador.com/busca.php?q=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.thought-card.mb-20").each((_, say) => {
    var frase = $(say).find("p").text().trim(); 
    var compartilhamentos = $(say).find("div.total-shares").text().trim(); 
    var autor = $(say).find("a").text().split("\n")[0];
    var imagem = $(say).find("div.sg-social-hidden.sg-social").attr('data-media');
    postagem.push({image: imagem, frase: frase, compartilhamentos: compartilhamentos});
    })
      resolve(postagem)
  }).catch(reject)
 });
}

async function buscarMenoresPrecos(produto) {
  const urlBase = 'https://www.tudocelular.com/?sName=';
  const produtoFormatado = produto.split(' ').join('+');
  const urlCompleta = urlBase + produtoFormatado;
  try {
      const response = await axios.get(urlCompleta);
      const html = response.data;
      const $ = cheerio.load(html);
      const linkProduto = $('a.item_movil').attr('href');
      console.log("Link do produto: ", linkProduto);
      // Aguarde 5 segundos antes de fazer a próxima requisição.
         return await buscarDetalhesProduto(linkProduto);

  } catch (error) {
      console.error('Erro na requisição ou Scrapping:', error);
  }
}

async function buscarDetalhesProduto(urlProduto) {
  try {
      const response = await axios.get(urlProduto);
      const htmlDetalhes = response.data;
      const $ = cheerio.load(htmlDetalhes);
      const semPromocoes = $('.price-alert-head-text').length > 0 || $('#comments > div:nth-child(2) > div > div > form > div:nth-child(5) > button').length > 0;
      if (semPromocoes) {
          return {error: "Não encontrado promoções para este produto."};
      }
      const nomeProduto = $('h2').text().trim();
      const imagemProduto = $('#sect_container aside img').attr('src');
      const descricaoProduto = $('.modeldesc').text().trim();
      const subtituloCompra = $('#comments div h4').text().trim();
      const menoresPrecos = [];
      $('#comments div').each((i, elem) => {
          if (i > 0) { // Ignorar o primeiro elemento que é o cabeçalho
              const nome = $(elem).find('a').eq(1).text().trim();
              let preco = $(elem).find('strong').text().trim();
              preco = preco.split('R$')[1] ? 'R$' + preco.split('R$')[1].trim() : preco;
              const linkCompra = $(elem).find('a.green_button').attr('href');

              if (nome !== 'VER OFERTA' && nome && preco && linkCompra) {
                  menoresPrecos.push({nome, preco, linkCompra});
              }
          }
      });
      if (menoresPrecos.length === 0) {
         return {error: 'Não foram encontrados produtos com preços disponíveis.'};
      }
        return {
              nomeProduto, 
              imagemProduto, 
              descricaoProduto, 
              linkCelular: urlProduto,
              subtituloCompra, 
              menoresPrecos
          };
  } catch (error) {
      console.error('Erro no scrapping dos detalhes:', error);
  }
}


async function geturl(nome) {
  return new Promise((resolve, reject) => {
const search = yts(nome)
            .then(async(data) => {
                const url = []
                const pormat = data.all
                for (let i = 0; i < pormat.length; i++) {
                    if (pormat[i].type == 'video') {
                        let dapet = pormat[i]
                        url.push(dapet.url)
}
}
var resultado = { 
link: url[0] 
}               
return(resultado) 
}) 
resolve(search)
})
}

 function gppq(pagina) {
return new Promise((resolve, reject) => {
 axios.get(`https://grupowhatsap.com/page/${pagina}/?amp=1`).then(tod => {
const $ = cheerio.load(tod.data)
var postagem = [];
$("div.grupo").each((_, say) => {
 var _ikk = $(say).find("a").attr('href');
 var _ikkli = $(say).find("img").attr('src');
 var _ikkkkk = {
img: _ikkli,
linkk: _ikk
 }
 postagem.push(_ikkkkk)
})
resolve(postagem)
 }).catch(reject)
});
 }
 
 
 const rastrear = async (id) => {
const res = await axios.get('https://www.linkcorreios.com.br/?id=' + id)
const $ = cheerio.load(res.data)
const breners = []
let info = $('ul.linha_status.m-0').find('li').text().trim();
let infopro = $('ul.linha_status').find('li').text().trim();
breners.push({ info, infopro })
return breners
}
 


const getgrupos = async () => {
let numberskk = ['1',
 '2',
 '3',
 '4',
 '5',
 '6',
 '7',
 '8',
 '9',
 '10',
 '11'] //acrecente mais!maximo e 60!
paginas = numberskk[Math.floor(Math.random() * numberskk.length)]
let ilinkkk = await gppq(paginas)
let linkedgpr = ilinkkk[Math.floor(Math.random() * ilinkkk.length)]
const res = await axios.get(linkedgpr.linkk)
const $ = cheerio.load(res.data)
var postagem = []
var img = $('div.post-thumb').find("amp-img").attr('src')
var nome = $('div.col-md-9').find('h1.pagina-titulo').text().trim()
var desc = $('div.col-md-9').find('p').text().trim()
var link = $('div.post-botao').find('a').attr('href')
postagem.push({ img, nome, desc, link })
return postagem
}



function pinterest(querry){
	return new Promise(async(resolve,reject) => {
		 axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + querry, {
			headers: {
			"cookie" : "_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0"
		}
			}).then(({ data }) => {
		const $ = cheerio.load(data)
		const result = [];
		const hasil = [];
   		 $('div > a').get().map(b => {
        const link = $(b).find('img').attr('src')
            result.push(link)
		});
   		result.forEach(v => {
		 if(v == undefined) return
		 hasil.push(v.replace(/236/g,'736'))
			})
			hasil.shift();
		resolve(hasil)
		})
	})
}


function styletext(texto) {
    return new Promise((resolve, reject) => {
        axios.get('http://qaz.wtf/u/convert.cgi?text='+texto)
        .then(({ data }) => {
            let $ = cheerio.load(data)
            let hasil = []
            $('table > tbody > tr').each(function (a, b) {
                hasil.push({ nome: $(b).find('td:nth-child(1) > span').text(), fonte: $(b).find('td:nth-child(2)').text().trim() })
            })
            resolve(hasil)
        })
    })
}

//wallpaper.mob.org
function wallmob() {
return new Promise((resolve, reject) => {
  axios.get(`https://wallpaper.mob.org/gallery/tag=anime/`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.image-gallery-image ").each((_, say) => {
   var img = $(say).find("img").attr('src');
    var resultado = {
    img: img
    }
    postagem.push(resultado)
  })
//  console.log(tod.data)
  resolve(postagem)
  }).catch(reject)
  });
}

//Assistirhentai Pesquisa
function assistitht(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://www.assistirhentai.com/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.videos").each((_, say) => {
    var nome = $(say).find("h2").text().trim(); 
    var img = $(say).find("img").attr('src');
    var link = $(say).find("a").attr('href');
    var data_up = $(say).find("span.video-data").text().trim(); 
    var tipo = $(say).find("span.selo-tipo").text().trim();     
    var eps = $(say).find("span.selo-tempo").text().trim();         
    var resultado = {
      nome: nome,
      img: img,
      link: link,
      data_up: data_up,
      tipo: tipo,
      total_ep: eps
    }
    postagem.push(resultado)
  })
//  console.log(tod.data)
  resolve(postagem)
  }).catch(reject)
  });
}

//Assistirhentai dl
function assistithtdl(link) {
return new Promise((resolve, reject) => {
  axios.get(`${link}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.meio").each((_, say) => {
    var nome = $(say).find("h1.post-titulo").text().trim(); 
    var img = $(say).find("img").attr('src');
    var descrição = $(say).find("p").text().trim(); 
    var link = $(say).find("source").attr('src');
    var resultado = {
      nome: nome,
      capa: img,
      descrição: descrição,
      link_dl: link
    }
    postagem.push(resultado)
  })
//  console.log(tod.data)
  resolve(postagem)
  }).catch(reject)
  });
}

//Porno gratis
function pornogratis(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://pornogratis.vlog.br/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.videos-row").each((_, say) => {
    var nome = $(say).find("a").attr('title');
    var img = $(say).find("img").attr('src');
    var link = $(say).find("a").attr('href');
    var resultado = {
      nome: nome,
      img: img,
      link: link
    }
    postagem.push(resultado)
  })
//  console.log(tod.data)
  resolve(postagem)
  }).catch(reject)
  });
}

function htdl(link) {
return new Promise((resolve, reject) => {
  axios.get(`${link}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.toggle").each((_, say) => {
    var link = $(say).find("video").attr('src');
    var resultado = {
      link: link
    }
    postagem.push(resultado)
  })
//  console.log(tod.data)
  resolve(postagem)
  }).catch(reject)
  });
}

function papeldeparede(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://wall.alphacoders.com/search.php?search=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.boxgrid").each((_, say) => {
    var titulo = $(say).find("a").attr('title');
    var link1 = $(say).find("a").attr('href');
    var link = `https://wall.alphacoders.com${link1}`
    var img = $(say).find("img").attr('src');    
    var resultado = {
      titulo: titulo,
      img: img,
      link: link
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

function xnxxdl(link_video) { return new Promise((resolve, reject) => {
fetch(link_video, {method: 'get'}).then(sexokk => sexokk.text()).then(sexokk => {var sayo = cheerio.load(sexokk, {xmlMode: false});resolve({
criador: "breno/sayo",
resultado: {título: sayo('meta[property="og:title"]').attr('content'),duração: sayo('meta[property="og:duration"]').attr('content'),img: sayo('meta[property="og:image"]').attr('content'),tipo_vd: sayo('meta[property="og:video:type"]').attr('content'),vd_altura: sayo('meta[property="og:video:width"]').attr('content'),vd_largura: sayo('meta[property="og:video:height"]').attr('content'),informações: sayo('span.metadata').text(),resultado2: {qualidade_baixa: (sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setVideoUrlLow\\(\'(.*?)\'\\);') || [])[1],qualidade_alta: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setVideoUrlHigh\\(\'(.*?)\'\\);' || [])[1],qualidade_HLS: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setVideoHLS\\(\'(.*?)\'\\);' || [])[1],capa: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setThumbUrl\\(\'(.*?)\'\\);' || [])[1],capa69: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setThumbUrl169\\(\'(.*?)\'\\);' || [])[1],capa_slide: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setThumbSlide\\(\'(.*?)\'\\);' || [])[1],capa_slide_grande: sayo('#video-player-bg > script:nth-child(6)').html().match('html5player.setThumbSlideBig\\(\'(.*?)\'\\);' || [])[1]}}})}).catch(err => reject({code: 503, status: false, result: err }))})}

//WIKIPEDIA
var wiki = async (query) => {
var res = await axios.get(`https://pt.m.wikipedia.org/wiki/${query}`)
var $ = cheerio.load(res.data)
var postagem = []
var titulo = $('#mf-section-0').find('p').text()
var capa = $('#mf-section-0').find('div > div > a > img').attr('src')
capaofc = capa ? capa : '//pngimg.com/uploads/wikipedia/wikipedia_PNG35.png'
img = 'https:' + capaofc
var título = $('h1#section_0').text()
postagem.push({ titulo, img })
return postagem
}

//FF
function ff(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://www.ffesportsbr.com.br/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("article.home-post.col-xs-12.col-sm-12.col-md-4.col-lg-4.py-3").each((_, say) => {
    var titulo = $(say).find("h2").text().trim();
    var keywords = $(say).find("ul").text().trim();
    var publicado = $(say).find("span").text().trim();
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('src');
    var resultado = {
      titulo: titulo,
      keywords: keywords,
      publicado: publicado,
      img: img,
      link: link
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

//INSTAGRAM STALK
function igstalk(nome) {
	return new Promise(async (resolve, reject) => {
		let {
			data
		} = await axios('https://www.instagram.com/' + nome + '/?__a=1', {
			'method': 'GET',
			'headers': {
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
				'cookie': 'isi sendiri cokie igeh'
			}
		})
		let user = data.graphql.user
		let json = {
			criador: '"_breno.exe_',
			status: 'online',
			code: 200,
			nome: user.username,
			nome_todo: user.full_name,
			verificado: user.is_verified,
			videos: user.highlight_reel_count,
			seguidores: user.edge_followed_by.count,
			seguindo: user.edge_follow.count,
			conta_business: user.is_business_account,
			conta_profissional: user.is_professional_account,
			categoria: user.category_name,
			capa: user.profile_pic_url_hd,
			bio: user.biography,
			info_conta: data.seo_category_infos
		}
		resolve(json)
	})
}

//DAFONTE
const dafontSearch = async (query) => {
const base = `https://www.dafont.com`
const res = await axios.get(`${base}/search.php?q=${query}`)
const $ = cheerio.load(res.data)
const hasil = []
const total = $('div.dffont2').text().replace(` fonts on DaFont for ${query}`, '') 
$('div').find('div.container > div > div.preview').each(function(a, b) {
$('div').find('div.container > div > div.lv1left.dfbg').each(function(c, d) { 
$('div').find('div.container > div > div.lv1right.dfbg').each(function(e, f) { 
let link = `${base}/` + $(b).find('a').attr('href')
let titulo = $(d).text() 
let estilo = $(f).text() 
hasil.push({ titulo, estilo, total, link }) 
}) 
}) 
}) 
return hasil
}

const dafontDownload = async (link) => {
const des = await axios.get(link)
const sup = cheerio.load(des.data)
const result = []
let estilo = sup('div').find('div.container > div > div.lv1right.dfbg').text() 
let titulo = sup('div').find('div.container > div > div.lv1left.dfbg').text() 
try {
isi = sup('div').find('div.container > div > span').text().split('.ttf')
saida = sup('div').find('div.container > div > span').eq(0).text().replace('ttf' , 'zip')
} catch {
isi = sup('div').find('div.container > div > span').text().split('.otf')
saida = sup('div').find('div.container > div > span').eq(0).text().replace('otf' , 'zip')
}
let download = 'http:' + sup('div').find('div.container > div > div.dlbox > a').attr('href')
result.push({ estilo, titulo, isi, saida, download})
return result
}

//GRUPO
function gpsrc(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://zaplinksbrasil.com.br/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.grupo").each((_, say) => {
    var titulo = $(say).find("a").attr('title');
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('src');
    var conteudo = $(say).find("div.listaCategoria").text().trim();
    var resultado = {
      titulo: titulo,
      img: img,
      conteudo: conteudo,
      link: link
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

//STICKER SEARCH
function st(nome) { return new
 Promise((resolve, reject) => {
		axios.get(`https://getstickerpack.com/stickers?query=${query}`)
			.then(({
				data
			}) => {
				const $ = cheerio.load(data)
				const link = [];
				$('#stickerPacks > div > div:nth-child(3) > div > a')
				.each(function(a, b) {
					link.push($(b).attr('href'))
				})
				rand = link[Math.floor(Math.random() * link.length)]
				axios.get(rand)
					.then(({
						data
					}) => {
						const $$ = cheerio.load(data)
						const url = [];
						$$('#stickerPack > div > div.row > div > img')
						.each(function(a, b) {
							url.push($$(b).attr('src').split('&d=')[0])})
				 		resolve({
							criador: '@breno',
							titulo: $$('#intro > div > div > h1').text(),
							autor: $$('#intro > div > div > h5 > a').text(),
							autor_link: $$('#intro > div > div > h5 > a').attr('href'),
							figurinhas: url
		 				})})})})}


//PORNHUB
function pornhub(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://pt.pornhub.com/video/search?search=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("li.pcVideoListItem.js-pop.videoblock.videoBox").each((_, say) => {
    var titulo = $(say).find("a").attr('title');
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('data-thumb_url');
    var duração = $(say).find("var.duration").text().trim();
    var qualidade = $(say).find("span.hd-thumbnail").text().trim();
    var autor = $(say).find("div.usernameWrap").text().trim();    
    var visualizações = $(say).find("span.views").text().trim();    
    var data_upload = $(say).find("var.added").text().trim();        
    var hype = $(say).find("div.value").text().trim();    
    var link2 = `https://pt.pornhub.com${link}`
    var resultado = {
      titulo: titulo,
      img: img,
      duração: duração,
      qualidade: qualidade,
      autor: autor,
      visualizações: visualizações,
      data_upload: data_upload,
      hype: hype,
      link: link2
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

//XVIDEOS
function xvideos1(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://xvideosporno.blog.br/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.postbox").each((_, say) => {
    var titulo = $(say).find("a").attr('title');
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('src');
    var duração = $(say).find("time.duration-top").text().trim();
    var qualidade = $(say).find("b.hd-top").text().trim();
    var resultado = {
      titulo: titulo,
      img: img,
      duração: duração,
      qualidade: qualidade,
      link: link
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

const xvideos= (q) => new Promise((resolve, reject) => {
  axios.get(`https://www.xvideos.com/?k=${removerAcentos(q).replaceAll(' ', '+')}`, {
      headers: {
        ...useragent_1
      }
    })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('div[class="thumb-block  "]').each((i, e) => {
        dados.push({
          titulo: $(e).find('.thumb-under > p > a').attr('title'),
          duracao: $(e).find('.thumb-under > p > a > span').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: 'https://www.xvideos.com' + $(e).find('.thumb-under > p > a').attr('href')
        });
      });
      resolve({
        status: res.status,
        criador: 'pedrozz',
        resultado: dados
      });
    })
    .catch((e) => {
      reject(e)
    });
});

//UPTODOWN
function uptodown(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://br.uptodown.com/android/search/${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.item").each((_, say) => {
    var titulo = $(say).find("div.name").text().trim();
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img.app_card_img.lazyload").attr('data-src');
    var descrição = $(say).find("div.description").text().trim();
    var resultado = {
      titulo: titulo,
      link: link,
      icone: img,
      descrição: descrição
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

//GRUPOS WHATSAPP
function gpwhatsapp() {
return new Promise((resolve, reject) => {
  axios.get(`https://gruposwhats.app/`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.col-12.col-md-6.col-lg-4.mb-4.col-group").each((_, say) => {
    var nome = $(say).find("h5.card-title").text().trim();
    var descrição = $(say).find("p.card-text").text().trim();
    var link = $(say).find("a.btn.btn-success.btn-block.stretched-link.font-weight-bold").attr('href');
    var img = $(say).find("img.card-img-top.lazy").attr('data-src');
    var resultado = {
      nome: nome,
      link: link,
      descrição: descrição,
      img: img
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}


//HENTAIS TUBE
function hentaistube(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://www.hentaistube.com/buscar/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.epiItem").each((_, say) => {
    var titulo = $(say).find("div.epiItemNome").text().trim();
    var link = $(say).find("a").attr('href');
    var img = $(say).find("img").attr('src');
    var resultado = {
      titulo: titulo,
      link: link,
      img: img
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}


//NERDING
function nerding(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://www.nerding.com.br/search?q=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.col-sm-6.col-xs-12.item-boxed-cnt").each((_, say) => {
    var titulo = $(say).find("h3.title").text().trim();
    var descrição = $(say).find("p.summary").text().trim();
    var imagem = $(say).find("img.lazyload.img-responsive").attr('src');
    var link = $(say).find("a.pull-right.read-more").attr('href');
    var review = $(say).find("span.label-post-category").text().trim();
//    var autor = $(say).find("p.post-meta-inner").text().trim();
    var resultado = {
      titulo: titulo,
      descrição: descrição,
      imagem: imagem,
      review: review,      
      link: link
//      autor: autor
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

//SOUND CLOUD DOWNLOAD
function soundl(link) {
return new Promise((resolve, reject) => {
		const opções = {
			method: 'POST',
			url: "https://www.klickaud.co/download.php",
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			formData: {
				'value': link,
				'2311a6d881b099dc3820600739d52e64a1e6dcfe55097b5c7c649088c4e50c37': '710c08f2ba36bd969d1cbc68f59797421fcf90ca7cd398f78d67dfd8c3e554e3'
			}
		};
		request(opções, async function(error, response, body) {
			console.log(body)
			if (error) throw new Error(error);
			const $ = cheerio.load(body)
			resolve({
				titulo: $('#header > div > div > div.col-lg-8 > div > table > tbody > tr > td:nth-child(2)').text(),
				total_downloads: $('#header > div > div > div.col-lg-8 > div > table > tbody > tr > td:nth-child(3)').text(),
				capa: $('#header > div > div > div.col-lg-8 > div > table > tbody > tr > td:nth-child(1) > img').attr('src'),
				link_dl: $('#dlMP3').attr('onclick').split(`downloadFile('`)[1].split(`',`)[0]
			});
		});
	})
}

//APKMODHACKER
function apkmodhacker(nome) {
return new Promise((resolve, reject) => {
  axios.get(`https://apkmodhacker.com/?s=${nome}`).then( tod => {
  const $ = cheerio.load(tod.data)  
  var postagem = [];
$("div.post-inner.post-hover").each((_, say) => {
    var nome = $(say).find("h2.post-title.entry-title").text().trim();
    var descrição = $(say).find("div.entry.excerpt.entry-summary").text().trim();
    var imagem = $(say).find("img.attachment-thumb-medium.size-thumb-medium.wp-post-image").attr('src');
    var link = $(say).find("a").attr('href');
    var categoria = $(say).find("p.post-category").text().trim();
    var horario_upload = $(say).find("time.published.updated").attr('datetime');   
    var resultado = {
      nome: nome,
      descrição: descrição,
      categoria: categoria,
      imagem: imagem,
      link: link,
      horario_upload: horario_upload
    }
    postagem.push(resultado)
  })
  resolve(postagem)
  }).catch(reject)
  });
}

async function wallpaper(title, page = '1') {
    return new Promise((resolve, reject) => {
        axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${title}`)
        .then(({ data }) => {
            let $ = cheerio.load(data)
            let hasil = []
            $('div.grid-item').each(function (a, b) {
                hasil.push({
                    title: $(b).find('div.info > a > h3').text(),
                    type: $(b).find('div.info > a:nth-child(2)').text(),
                    source: 'https://www.besthdwallpaper.com/'+$(b).find('div > a:nth-child(3)').attr('href'),
                    image: [$(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'), $(b).find('picture > source:nth-child(1)').attr('srcset'), $(b).find('picture > source:nth-child(2)').attr('srcset')]
                })
            })
            resolve(hasil)
        })
    })
}

async function wikimedia(title) {
    return new Promise((resolve, reject) => {
        axios.get(`https://commons.wikimedia.org/w/index.php?search=${title}&title=Special:MediaSearch&go=Go&type=image`)
        .then((res) => {
            let $ = cheerio.load(res.data)
            let hasil = []
            $('.sdms-search-results__list-wrapper > div > a').each(function (a, b) {
                hasil.push({
                    title: $(b).find('img').attr('alt'),
                    source: $(b).attr('href'),
                    image: $(b).find('img').attr('data-src') || $(b).find('img').attr('src')
                })
            })
            resolve(hasil)
        })
    })
}

async function styletext(teks) {
    return new Promise((resolve, reject) => {
        axios.get('http://qaz.wtf/u/convert.cgi?text='+teks)
        .then(({ data }) => {
            let $ = cheerio.load(data)
            let hasil = []
            $('table > tbody > tr').each(function (a, b) {
                hasil.push({ name: $(b).find('td:nth-child(1) > span').text(), result: $(b).find('td:nth-child(2)').text().trim() })
            })
            resolve(hasil)
        })
    })
}

//ja fiz

async function hentai() {
    return new Promise((resolve, reject) => {
        const page = Math.floor(Math.random() * 1153)
        axios.get('https://sfmcompile.club/page/'+page)
        .then((data) => {
            const $ = cheerio.load(data.data)
            const hasil = []
            $('#primary > div > div > ul > li > article').each(function (a, b) {
                hasil.push({
                    title: $(b).find('header > h2').text(),
                    link: $(b).find('header > h2 > a').attr('href'),
                    category: $(b).find('header > div.entry-before-title > span > span').text().replace('in ', ''),
                    share_count: $(b).find('header > div.entry-after-title > p > span.entry-shares').text(),
                    views_count: $(b).find('header > div.entry-after-title > p > span.entry-views').text(),
                    type: $(b).find('source').attr('type') || 'image/jpeg',
                    video_1: $(b).find('source').attr('src') || $(b).find('img').attr('data-src'),
                    video_2: $(b).find('video > a').attr('href') || ''
                })
            })
            resolve(hasil)
        })
    })
}

async function twitter(link){
	return new Promise((resolve, reject) => {
		let config = {
			'URL': link
		}
		axios.post('https://twdown.net/download.php',qs.stringify(config),{
			headers: {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
				"sec-ch-ua": '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				"cookie": "_ga=GA1.2.1388798541.1625064838; _gid=GA1.2.1351476739.1625064838; __gads=ID=7a60905ab10b2596-229566750eca0064:T=1625064837:RT=1625064837:S=ALNI_Mbg3GGC2b3oBVCUJt9UImup-j20Iw; _gat=1"
			}
		})
		.then(({ data }) => {
		const $ = cheerio.load(data)
		resolve({
				desc: $('div:nth-child(1) > div:nth-child(2) > p').text().trim(),
				thumb: $('div:nth-child(1) > img').attr('src'),
				HD: $('tbody > tr:nth-child(1) > td:nth-child(4) > a').attr('href'),
				SD: $('tr:nth-child(2) > td:nth-child(4) > a').attr('href'),
				audio: 'https://twdown.net/' + $('tr:nth-child(4) > td:nth-child(4) > a').attr('href')
			})
		})
	.catch(reject)
	})
}

async function quotesAnime() {
    return new Promise((resolve, reject) => {
        const page = Math.floor(Math.random() * 184)
        axios.get('https://otakotaku.com/quote/feed/'+page)
        .then(({ data }) => {
            const $ = cheerio.load(data)
            const hasil = []
            $('div.kotodama-list').each(function(l, h) {
                hasil.push({
                    link: $(h).find('a').attr('href'),
                    gambar: $(h).find('img').attr('data-src'),
                    karakter: $(h).find('div.char-name').text().trim(),
                    anime: $(h).find('div.anime-title').text().trim(),
                    episode: $(h).find('div.meta').text(),
                    up_at: $(h).find('small.meta').text(),
                    quotes: $(h).find('div.quote').text().trim()
                })
            })
            resolve(hasil)
        }).catch(reject)
    })
}

async function wallpaper2(query) {
	return new Promise((resolve, reject) => {
		axios.get('https://www.wallpaperflare.com/search?wallpaper='+ query,{
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				"cookie": "_ga=GA1.2.863074474.1624987429; _gid=GA1.2.857771494.1624987429; __gads=ID=84d12a6ae82d0a63-2242b0820eca0058:T=1624987427:RT=1624987427:S=ALNI_MaJYaH0-_xRbokdDkQ0B49vSYgYcQ"
			}
		})
		.then(({ data }) => {
			const $ = cheerio.load(data)
			const result = [];
			$('#gallery > li > figure > a').each(function(a, b) {
				result.push($(b).find('img').attr('data-src'))
			})
			resolve(result)
		})
	.catch({status: 'err'})
	})
}

async function hentaihome(nome) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.hentaihome.net/?s=${nome}`).then( ({data}) => {
      const $ = cheerio.load(data)
      var postagem = [];
      $('.video-conteudo').each((i, e) => {
       if($(e)?.text()?.trim() != '') {
        postagem.push({
          nome: $(e).text().trim(),
          link: $(e)?.find('a')?.attr('href')?.trim(),
          imagem: $(e)?.find('img')?.attr('src')?.trim()
        })
        }
      });
      resolve({status: 200, autor: 'WORLD ECLETIX', resultado: postagem})
    })
    .catch(e => {
      reject({status: 500, msg: `Erro no módulo`})
    });
  });
}

async function lojadomecanico(nome) {
  return new Promise((resolve, reject) => {
    axios.get(`https://busca.lojadomecanico.com.br/busca?q=${nome}`).then( ({data}) => {
      const dados = [];
      const $ = cheerio.load(data);
      $(`li[class="nm-product-item col-xs-6 col-sm-3 product-box"]`).each((i, e) => {
        dados.push({
          nome: $(e).attr('data-name'),
          preco: "R$ " + $(e).attr('data-price'),
          marca: $(e).attr('data-brand'),
          categoria: $(e).attr('data-category'),
          imagem: "https:" + $(e).find('div > div > a > img').attr('src'),
          link: "https:" + $(e).find('div > div > a').attr('href'),
        });
      });
      resolve({status: 200, autor: 'WORLD ECLETIX', resultado: dados})
    })
    .catch(e => {
      reject({status: 500, msg: `Erro no módulo`})
    });
  });
}
//ja fiz
async function animesFireSearch(nome) {
  return new Promise( (resolve, reject) => {
    axios.get(`https://animefire.net/pesquisar/${encodeURI(nome.toLowerCase().replaceAll(' ', '-'))}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36",
        "cookie": "a=JvTevu353yc2390gXtq7FVvF7TfRZfos; sid=3bFGrp0wysJs82nHdQTevzpY8Xl-bSKaFx9B-Ez1AlV%2CXuoQsG9hEJ4N8-oSzG7n;"
    }
  }).then( ({data}) => {
      const dados = []
      const $ = cheerio.load(data)
      $('article[class="card cardUltimosEps"]').each( (i, e) => {
        dados.push({
          titulo: $(e).find('h3').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: $(e).find('a').attr('href')
        });
      });
      resolve({status: 200, autor: 'WORLD ECLETIX', resultado: dados})
    })
    .catch(e => {
      console.log(e)
    });
  });
}

async function animesFireEps(link) {
  return new Promise( (resolve, reject) => {
  if(!link.includes('animefire.net')) throw new Error('Esse não é um link válido')
    axios.get(link, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36",
        "cookie": "a=JvTevu353yc2390gXtq7FVvF7TfRZfos; sid=3bFGrp0wysJs82nHdQTevzpY8Xl-bSKaFx9B-Ez1AlV%2CXuoQsG9hEJ4N8-oSzG7n;"
    }
  }).then( ({data}) => {
      const eps = []
      const generos = []
      const $ = cheerio.load(data)
      const imagem = $('.sub_animepage_img').find('img').attr('data-src')
      const titulo = $('h6[class="text-gray mb-0"]').text()
      const desc = $('div[class="divSinopse mb-3 mt-3 ml-2 ml-sm-1 ml-md-2 mr-2"]').text()?.trim()
      $('a[class="mr-1 spanAnimeInfo spanGeneros spanGenerosLink"]').each( (i, e) => {
        generos.push($(e).text())
      })
      $('a[class="lEp epT divNumEp smallbox px-2 mx-1 text-left d-flex"]').each( (i, e) => {
        eps.push({
        titulo: $(e).text(),
        link: $(e).attr('href')
        })
      })
      json = {
      status: 200,
      autor: 'WORLD ECLETIX',
      imagem: imagem,
      titulo: titulo,
      sinopse: `${desc.startsWith('Sinopse: ') ? desc.slice(9)?.trim() : desc?.trim()}`,
      generos: generos,
      episodios: eps
      }
      resolve(json)
    })
    .catch(e => {
      console.log(e)
    });
  });
}

async function fetchJson(url, options) {
  return new Promise(async (resolve, reject) => {
    fetch(url, options)
    .then(response => response.json())
    .then(json => {
      resolve(json)
     })
    .catch((err) => {
     reject(err)
    })
})
}

async function animeFireDownload(link) {
 return new Promise((resolve, reject) => {
  if(!link.includes('animefire.net')) throw new Error('Esse não é um link válido')
   axios.get(`${link}`, {
    headers: {
     "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36",
     "cookie": "a=JvTevu353yc2390gXtq7FVvF7TfRZfos; sid=3bFGrp0wysJs82nHdQTevzpY8Xl-bSKaFx9B-Ez1AlV%2CXuoQsG9hEJ4N8-oSzG7n;"
    }
   }).then( async ({data}) => {
    const $ = cheerio.load(data)
    const nome = $('h1[class="sectionVideoEpTitle text-white"]').text()
    const desc = $('#video_sinopse').text()?.trim()
    const linkVdo = $('#my-video')?.attr('data-video-src') || {data: [{label: '', src: $('iframe[style="position: absolute;width: 100%; height: 100%;top: 0;right: 0;left: 0;"]').attr('src')}]}
    const link_videoJson = $('#my-video')?.attr('data-video-src') ? await fetchJson(linkVdo) : linkVdo
    const link_video = link_videoJson.data
    const thumb = $('meta[itemprop="thumbnailUrl"]').attr('content')
    json = {
      status: 200,
      autor: 'WORLD ECLETIX',
      nome: nome,
      sinopse: `${desc.startsWith('Sinopse:') ? desc.slice(9)?.trim() : desc?.trim()}`,
      thumb: thumb,
      link_video: link_video
   }
   resolve(json)
  })
  .catch(e => {
  console.log(e)
  })
 })
}

async function mediafireDl(link) {
  return new Promise((resolve, reject) => {
    if(!link.includes('mediafire')) throw new Error('Apenas links do mediafire são suportados')
    axios.get(`${link.split('?dkey')[0]}`).then(({data}) => {
      const $ = cheerio.load(data)
      nome = decodeURI($('a#downloadButton').attr('href').split('/')[5]).replaceAll("+", " ").replaceAll("%2B", "+").replaceAll("%26", "&").trim(),
      link = $('a#downloadButton').attr('href').trim(),
      tipo = nome.split('.').pop().trim()
      peso = $('a#downloadButton').text().replaceAll('Download', '').replaceAll('(', '').replaceAll(')', '').replaceAll('\n', '').replaceAll('\n', '').trim(),
      json = { 
      nome, 
      link, 
      tipo, 
      peso}
      resolve(json)
    }).catch(e => {
      reject(e)
    });
  });
}


async function hentaitube(nome) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.hentaistube.com/buscar/?s=${nome}`).then( ({data}) => {
      const $ = cheerio.load(data)
      var dados = []
      $('.epiItem').each((i, e) => {
        dados.push({
        nome: $(e).find('a').attr('title').trim(),
        imagem: $(e).find('img').attr('src').trim(),
        link: $(e).find('a').attr('href').trim()
        })
      });
      resolve({status: 200, autor: 'WORLD ECLETIX', resultado: dados})

    })
    .catch(e => {
      console.log(e)
    });
  });
}

async function randomGrupos(categoria) {
  return new Promise( (resolve, reject) => {
    const categorias = [
    "amizade",
    "amor-e-romance",
    "desenhos-e-animes",
    "figurinhas-e-stickers",
    "memes-engracados",
    "filmes-e-series",
    "links",
    "namoro"
    ]
    if(!categoria) categoria = categorias[Math.floor(Math.random() * categorias.length)]
    axios.get(`https://gruposwhats.app/category/${categoria}`)
    .then( async ({data}) => {
      const $ = cheerio.load(data)
      let dados
      dados = []
      $('div[class="col-12 col-md-6 col-lg-4 mb-4 col-group"]').each(function (i, e) {
        dados.push({
          nome: $(e).find('h5').text(),
          desc: $(e).find('p').text().trim(),
          imagem: $(e).find('img').attr('data-src'),
          link: $(e).find('a').attr('href').replace('/group/', '/join-group/')
        })
      })
      dados2 = []
      dados = dados.filter(a => a.link.includes(`gruposwhats.app`) && !a.link.includes(`email`))
      for(var i=0; i < dados.length; i++) {
      try {
          teks = await axios.get(dados[i].link)
          const S = cheerio.load(teks.data)
          result = S('#main_block').find('a').attr('href')
          dados2.push({
          nome: dados[i].nome,
          desc: dados[i].desc,
          imagem: dados[i].imagem,
          link: result
          })
      } catch {}
      }
      
      resolve({status: 200, criador: 'WORLD ECLETIX', resultado: dados2})
    })
    .catch(e => {
      reject(e)
    })
  })
}
//ja fiz 
async function topFlix(query) {
  return new Promise((resolve, reject) => {
    axios.get(`https://topflix.one/list/filmes/${query}/`)
    .then( ({data}) => {
      const $ = cheerio.load(data)
      const dados = []
      $('div[class="movie-item-style-1"]').each( function (i, e) {
        dados.push({
          nome: $(e).find('h6 > a').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: 'https://topflix.one'+$(e).find('h6 > a').attr('href')
        })
      })
      resolve({status: 200, criador: 'WORLD ECLETIX', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function topFlixDL(url) {
  return new Promise((resolve, reject) => {
    axios.get(url)
    .then( ({data}) => {
      const $ = cheerio.load(data)
      fs.writeFileSync('topflixdl.html', $.html())
      return
      const dados = []
      $('div[class="movie-item-style-1"]').each( function (i, e) {
        dados.push({
          nome: $(e).find('h6 > a').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: 'https://topflix.one'+$(e).find('h6 > a').attr('href')
        })
      })
      resolve({status: 200, criador: 'WORLD ECLETIX', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function pinterestVideo(link) {
  return new Promise(async(resolve, reject) => {
    axios.get(link)
    .then(async res => {
      const $ = cheerio.load(res.data)
      const json = JSON.parse($('script[data-test-id="video-snippet"]').text())
      resolve({
        status: 200,
        autor: 'WORLD ECLETIX',
        titulo: json.name,
        thumb: json.thumbnailUrl,
        video: json.contentUrl
      })
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function pinterestVideoV2(url) {
  return new Promise(async(resolve, reject) => {
    let payload = {
      url: url
    }
    axios.post('https://pinterestvideodownloader.com/', qs.stringify(payload), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Mobile Safari/537.36'
      },
    })
    .then(async ({data}) => {
      const $ = cheerio.load(req.data)
      resolve({
        status: 200,
        autor: '+55 94 9147-2796',
        video:  $('a[style="background-color: green;"]').attr('href'),
        thumb: $('a[style="background-color: blue;"]').attr('href')
      })
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function ultimasNoticias() {
 return new Promise((resolve, reject) => {
   axios.get(`https://news.google.com/topstories?hl=pt-BR&gl=BR&ceid=BR:pt-419`).then(async ({data}) => {
    const $ = cheerio.load(data)
    const dados = []
    const dados2 = []
    $('h4[class="ipQwMb ekueJc RD0gLb"]').each((i, e) => {
     dados.push({
       titulo: $(e).find('a').text(),
        link: 'https://news.google.com' + $(e).find('a').attr('href').slice(1)
     })
   })
   for(i=0; i < dados.length; i++) {
     const aXio = await axios.get(dados[i].link)
     const $$ = cheerio.load(aXio.data)
     dados2.push({
       titulo: dados[i].titulo,
       link: $$('div[class="m2L3rb eLNT1d"]').find('a').attr('href')
     })
   }
   resolve({status: 200, autor: '+55 94 9147-2796', resultado: dados2})
  })
   .catch(e => {
     reject(e)
   })
 })
}

async function uptodownsrc(query) {
  return new Promise(async(resolve, reject) => {
    axios.get(`https://br.uptodown.com/android/search/${query}`)
    .then(async ({data}) => {
      const $ = cheerio.load(data);
      const dados = [];
      $('div[class="item"]').each(function(i, e) {
        dados.push({
          nome: $(e).find('a').text(),
          desc: $(e).find('.description').text(),
          imagem: $(e).find('img').attr('src'),
          link: $(e).find('a').attr('href').split("uptodown.com/")[0]+"uptodown.com/"
        });
      });
      resolve({status: 200, autor: '+55 94 9147-2796', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function uptodowndl(url) {
  return new Promise(async(resolve, reject) => {
    axios.get(url+'android/download')
    .then(async(res) => {
      const $ = cheerio.load(data)
      resolve({
        aplicativo: $('#detail-app-name').text().trim(),
        versãoApp: $('div[class="version"]').text(),
        pesoApp: $('p[class="size"]').text(),
        download: $('#detail-download-button').attr('data-url')
      })
    })
    .catch(e => {
      reject(e)
    });
  });
}

//uptodowndl("https://angry-birds-dream-blast.br.uptodown.com/android").then(console.log)

async function teste(url) {
  return new Promise((resolve, reject) => {
    headers = {
  "Host": "y2mate.is",
  "Connection": "keep-alive",
  "sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Yandex\";v=\"22\"",
  "Accept": "application/json, text/javascript, *//*; q=0.01",
  "User-Agent": "Mozilla/5.0 (Linux; arm_64; Android 11; M2004J19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.5.73.00 SA/3 Mobile Safari/537.36",
  "Origin": "https://en.y2mate.is",
  "Referer": "https://en.y2mate.is/",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
}
    axios.get(`https://y2mate.is/analyze?url=${url}`, {headers: headers})
    .then( (res) => {
      const video = []
      const audio = []
      for(a of res.data.video) {
        video.push({
        quality: a.quality,
        
        })
      }
    })
    .catch(e => {
      reject(e)
    });
  });
}


async function xvideosSearch(q) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.xvideos.com/?k=${encodeUrl(q.replaceAll(' ', '+'))}`, {
    headers: {
       "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('div[class="thumb-block  "]').each(function(i, e) {
        dados.push({
          titulo: $(e).find('.thumb-under > p > a').attr('title'),
          duracao: $(e).find('.thumb-under > p > a > span').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: 'https://www.xvideos.com' + $(e).find('.thumb-under > p > a').attr('href')
        });
      });
      resolve({status: res.status, criador: 'WORLD ECLETIX', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function mercadoLivreSearch(q) {
  return new Promise((resolve, reject) => {
    axios.get(`https://lista.mercadolivre.com.br/${encodeUrl(q.replace(/[À-ü]/g, '').trim())}`, {
    headers: {
       "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('div[class="andes-card andes-card--flat andes-card--default andes-card--padding-default"]').each((i, e) => {
        json = {
          produto: $(e).find('h2:first').text(),
          id: $(e).find('input[name="itemId"]').attr('value'),
          imagem: $(e).find('img:first').attr('data-src') || $(e).find('img:first').attr('src'),
          preco: 'R$ '+ $(e).find('.price-tag-fraction:first').text(),
          link: $(e).find('a:first').attr('href')
        }
        if(json.preco && json.imagem && json.link) dados.push(json);
      });
      resolve({status: res.status, criador: '🔥 WORLD ECLETIX 🔥', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function xvideosDownloader(url) {
  return new Promise((resolve, reject) => {
    axios.get(url, {
    headers: {
       "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then((res) => {
      const $ = cheerio.load(res.data);
      const dados = [];
      const dados1 = $('script[type="application/ld+json"]')
      resolve({
      status: res.status, 
      admin: 'world ecletix', 
      resultado: {
      titulo: dados1.name, 
      descrição: dados1.description, 
      download: dados1.contentUrl}})
    })
    .catch(e => {
      reject(e)
    });
  });
}



async function hentaiimg(title) {
    return new Promise((resolve, reject) => {
        const page = Math.floor(Math.random * 10)
        axios.get(`https://rule34.world/${title}/page/${page}`)
        .then((res) => {
            const $ = cheerio.load(res.data)
            const hasil = []
            $('app-post-grid > app-grid > app-loading-block > div > div.box-grid.ng-star-inserted > app-post-preview').each(function (a, b) {
                hasil.push('https://rule34.world'+$(b).find('img').attr('src'))
            })
            resolve({ 
            status: res.status, 
            admin: 'world ecletix', 
            resultado: hasil })
        })
    })
}



async function hentaivid() {
    return new Promise((resolve, reject) => {
        const page = Math.floor(Math.random() * 1153)
        axios.get('https://sfmcompile.club/page/'+page)
        .then((data) => {
            const $ = cheerio.load(data.data)
            const hasil = []
            $('#primary > div > div > ul > li > article').each(function (a, b) {
                hasil.push({
                    titulo: $(b).find('header > h2').text(),
                    link: $(b).find('header > h2 > a').attr('href'),
                    categoriaVid: $(b).find('header > div.entry-before-title > span > span').text().replace('in ', ''),
                    compartilhamentos: $(b).find('header > div.entry-after-title > p > span.entry-shares').text(),
                    visualizações: $(b).find('header > div.entry-after-title > p > span.entry-views').text(),
                    tipo: $(b).find('source').attr('type') || 'image/jpeg',
                    videoDown_1: $(b).find('source').attr('src') || $(b).find('img').attr('data-src'),
                    videoDown_2: $(b).find('video > a').attr('href') || ''
                })
            })
            const random = hasil[Math.floor(Math.random() * hasil.length)]
            resolve({
                status: data.status,
                admin: 'wa.me/5582988279194',
                resultado: random
            })
        })
    })
}

async function pensadorSearch(query) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.pensador.com/busca.php?q=${query}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('p[class="frase fr"]').each(function() {
      const resultado = $(this).text()
               dados.push({frase: resultado})
      });
      resolve(dados)
    })
    .catch(e => reject(e))
  })
}

async function fraseAmor() {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.pensador.com/frases_de_amor/${Math.floor(Math.random() * 10)}/`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('p[class="frase fr"]').each(function() {
        dados.push($(this).text())
      });
      resolve(dados)
    })
    .catch(e => reject(e))
  })
}
// frases_psicologia
async function frasesPensador(url = `https://www.pensador.com/frases_de_otimismo/${Math.floor(Math.random() * 100)}/`) {
  return new Promise((resolve, reject) => {
    axios.get(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('p[class="frase fr"]').each(function() {
        dados.push($(this).text())
      });
      resolve(dados)
    })
    .catch(e => reject(e))
  })
}

async function animesBrSearch(q) {
  return new Promise((resolve, reject) => {
    axios.get(`https://animesbr.biz/search/${q.replaceAll(' ', '+')}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('#archive-content').each((i, e) => {
        dados.push({
          titulo: $(e).find('img').attr('alt'),
          imagem: $(e).find('img').attr('src'),
          link: $(e).find('a').attr('href'),
          estrelas: $(e).find('.rating').text().trim()
        });
      });
      resolve({status: res.status, criador: '+55 94 9147-2796', resultado: dados})
    })
    .catch(e => reject(e))
  });
}

async function ultimasNoticias() {
  return new Promise(async(resolve, reject) => {
    const dados1 = [];
    const dados2 = [];
    const dados3 = [];
    const dados4 = [];
    const dados5 = [];
    const shuffleArray = function (arr) {
        // Loop em todos os elementos
    for (let i = arr.length - 1; i > 0; i--) {
            // Escolhendo elemento aleatório
        const j = Math.floor(Math.random() * (i + 1));
        // Reposicionando elemento
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Retornando array com aleatoriedade
    return arr;
}
    const nt1 = await axios.get('https://g1.globo.com', {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    }).catch();
    if(nt1){
    var $ = cheerio.load(nt1.data);
    $('.bastian-feed-item').each(function(){
    json = {
        titulo: $(this).find('._evt > a').text(),
        imagem: $(this).find('img').attr('src'),
        link: $(this).find('._evt > a').attr('href')
      }
    if(json.titulo && json.imagem && json.link) dados1.push(json)
    })
    }
    const nt2 = await axios.get('https://www.cnnbrasil.com.br/', {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    }).catch();
    if(nt2) {
    var $ = cheerio.load(nt2.data)
    $('li[class=" home__list__item home__list__item--first"]').each((i,e)=>{
      json = {
        titulo: $(e).find('.home__title').text(),
        imagem: $(e).find('img').attr('src'),
        link: $(e).find('a').attr('href')
      }
      if(json.titulo && json.imagem && json.link) dados2.push(json)
    })
    }
    const nt3 = await axios.get('https://www.estadao.com.br/', {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    }).catch();
    if(nt3) {
    var $ = cheerio.load(nt3.data)
    $('div[class="col-xl-4 col-md-4 col-12"]').each((i,e)=>{
      json = {
        titulo: $(e).find('.image > a').attr('title'),
        imagem: 'https://www.estadao.com.br'+$(e).find('img').attr('src'),
        link: $(e).find('.image > a').attr('href')
      }
      if(json.titulo && json.imagem && json.link) dados3.push(json)
    })
    }
    const nt4 = await axios.get('https://noticias.uol.com.br/', {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    }).catch();
    if(nt4) {
    var $ = cheerio.load(nt4.data)
    $('.thumbnails-wrapper').each((i,e)=>{
      json = {
        titulo: $(e).find('h3').text(),
        imagem: $(e).find('img').attr('data-src') || $(e).find('img').attr('src'),
        link: $(e).find('a').attr('href')
      }
      if(json.titulo && json.imagem && json.link) dados4.push(json)
    })
    }
    const nt5 = await axios.get('https://www.metropoles.com/', {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    }).catch();
    if(nt5) {
    var $ = cheerio.load(nt5.data)
    $('article[class="m-feed m-feed-small "]').each((i,e)=>{
      json = {
        titulo: $(e).find('a').attr('data-title'),
        imagem: $(e).find('img').attr('data-src') || $(e).find('img').attr('src'),
        link: $(e).find('a').attr('href')
      }
      if(json.titulo && json.imagem && json.link) dados5.push(json)
    })
    }
    resolve(shuffleArray([...dados1, ...dados2, ...dados3, ...dados4, ...dados5]))
  });
}

async function iFunny() {
  return new Promise((resolve, reject) => {
    axios.get('https://br.ifunny.co/page'+Math.floor(Math.random() * 99), {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      const dados2 = [];
      $('._0ZvA').each((i,e) => {
        var json = {
          titulo: $(e).find('a[class="WiQc mVpV HGgf"]').text() || $(e).find('img:first').attr('alt') || $(e).find('a:first').attr('aria-label') || 'Sem Titulo',
          imagem: $(e).find('img:first').attr('data-src'),
          link: $(e).find('a:first').attr('href')
        }
        var json2 = {
          titulo: $(e).find('a[class="WiQc mVpV HGgf"]').text() || $(e).find('img:first').attr('alt') || $(e).find('a:first').attr('aria-label') || 'Sem Titulo',
          thumb: $(e).find('video:first').attr('data-poster'),
          video: $(e).find('video:first').attr('data-src'),
          link: $(e).find('a:first').attr('href')
        }
        json.imagem && dados.push(json);
        json2.video && json2.video.toLowerCase().includes("mp4") && dados2.push(json2);
      });
      resolve({status: res.status, autor: '+55 94 9147-2796', imagens: dados, videos: dados2})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function memesDroid() {
  return new Promise((resolve, reject) => {
    axios.get('https://pt.memedroid.com/memes/latest?ts='+randomIntFromInterval(1567359809, 1667395806), {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('.gallery-item').each((i, e) => {
        var json = {
          titulo: $(e).find('a[class="item-header-title dyn-link"]').text()?.trim() || '',
          imagem: $(e).find('img:first').attr('src'),
          link: 'https://pt.memedroid.com' + $(e).find('a[class="item-header-title dyn-link"]').attr('href')
        }
        json.imagem && json.imagem.includes("memedroid") && dados.push(json);
      });
      resolve({status: res.status, resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function animesGoyabu(q) {
  return new Promise((resolve, reject) => {
    axios.get("https://goyabu.com/?s="+q.replace(/ /g, '+'), {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('.anime-episode').each((i, e) => {
        dados.push({
          titulo: $(e).find('h3').text(),
          imagem: $(e).find('img').attr('data-cfsrc'),
          link: $(e).find('a').attr('href')
        });
      });
      resolve({status: res.status, criador: '+55 94 9147-2796', resultado: dados})
    })
    .catch(e => reject(e))
  });
}

async function animesGoyabu2(url) {
  return new Promise((resolve,reject) => {
    axios.get(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('div[class="row rowls"] > a').each((i,e) => {
        dados.push({
          episodio: $(e).find('div').eq(1).text().split($(e).find('.genre-tag').text())[0].trim(),
          link: $(e).attr('href')
        });
      });
      resolve({
        status: res.status,
        criador: '+55 94 9147-2796',
        titulo: $('.anime-title > h1').text(),
        imagem: $('.anime-bg2').find('img').attr('data-cfsrc'),
        sinopse: $('.anime-description').text().trim(),
        episodios: dados
      })
    })
    .catch(e => {
      reject(e)
    })
  })
}

async function lulaFlix() {
  return new Promise((resolve, reject) => {
    axios.get(`https://lulaflix.com.br/`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(res => {
      const $ = cheerio.load(res.data);
      const dados = [];
      const dados2 = [];
      $('div[class="post-inner post-hover"]').each((i, e) => {
        dados.push({
          titulo: $(e).find('.post-title > a:first').text(),
          foto: $(e).find('img').attr('src'),
          desc: $(e).find('div[class="entry excerpt"]').text().trim(),
          postado: $(e).find('ul[class="post-meta group"] > li').eq(1).text(),
          link: $(e).find('.post-title > a:first').attr('href')
        })
      })
      $('.featured-item').each((i,e) => {
        dados2.push({
          titulo: $(e).find('h3.featured-title').text(),
          foto: $(e).attr('style').replace('background-image:url(\'', '').replace('\');', ''),
          postado: $(e).find('.featured-date').text(),
          link: $(e).find('a').attr('href')
        })
      })
      resolve({status: res.status, resultado: dados, outro: dados2})
    })
    .catch(e => reject(e))
  })
}

async function gruposZap(url = `https://www.gruposdewhatss.com.br/grupos-de-whatsapp-figurinhas/page/${Math.floor(Math.random() * 9)}`) {
  return new Promise((resolve, reject) => {
    axios.get(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(async (res) => {
      const $ = cheerio.load(res.data);
      const dados = [];
      $('.cardGroupInt').each((i,e) => {
        dados.push({
          titulo: $(e).find('.imgGroup').attr('title'),
          imagem: 'https://www.gruposdewhatss.com.br' + $(e).find('.imgGroup').attr('src'),
          link: 'https://www.gruposdewhatss.com.br' + $(e).find('a:first').attr('href')
        });
      });
      const dados2 = [];
      for (var i = 0; i < dados.length; i++) {
        try {
          ras = await axios.get(dados[i].link)
          const $$ = cheerio.load(ras.data)
          dados2.push({titulo: dados[i].titulo, imagem: dados[i].imagem, link: $$('a[class="btn btn-success w-100 mt-4 mb-4"]').attr('href')})
        } catch (e) { console.log(e) }
      }
      resolve({status: res.status, autor: '+55 94 9147-2706', resultado: dados2})
    })
    .catch(e => {
      reject(e)
    });
  });
}
// ja fix as de baixo 
async function partidoLiberal() {
  return new Promise((resolve, reject) => {
    axios.get("https://partidoliberal.org.br/", {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(async (res) => {
      const dados = [];
      const $ = cheerio.load(res.data)
      $('.noticia').each((i, e) => {
        dados.push({
          titulo: $(e).find('h3').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: $(e).find('a:first').attr('href')
        });
      });
      resolve({status: res.status, autor: '+55 94 9147-2706', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function partidoDosTrouxas() {
  return new Promise((resolve, reject) => {
    axios.get("https://pt.org.br/", {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then(async (res) => {
      const dados = [];
      const $ = cheerio.load(res.data)
      $('.noticia').each((i, e) => {
        dados.push({
          titulo: $(e).find('h3').text(),
          imagem: $(e).find('img').attr('data-src'),
          link: $(e).find('a:first').attr('href')
        });
      });
      resolve({status: res.status, resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function amazonSearch(query) {
  return new Promise((resolve, reject) => {
    axios.get(`https://www.amazon.com.br/s?k=${encodeUrl(query)}&ref=nb_sb_noss`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then((res) => {
      const dados = [];
      const $ = cheerio.load(res.data)
      $('div[data-component-type="s-search-result"]').each((i, e) => {
        dados.push({
          titulo: $(e).find('span[class="a-size-small a-color-base a-text-normal"]').text(),
          preco: $(e).find('span[class="a-offscreen"]:first').text(),
          imagem: $(e).find('img.s-image').attr('srcset') ? (linkfy.find($(e).find('img.s-image').attr('srcset'))?.pop()?.href || $(e).find('img.s-image').attr('src')) : $(e).find('img.s-image').attr('src'),
          link: 'https://www.amazon.com.br' + $(e).find('a:first').attr('href')
        });
      });
      resolve({status: res.status, autor: '+55 94 9147-2796', resultado: dados})
    })
    .catch(e => {
      reject(e)
    });
  });
}

async function letrasMusica(queryUrl) {
  return new Promise((resolve, reject) => {
    axios.get(`${queryUrl}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
      }
    })
    .then((res) => {
      const $ = cheerio.load(res.data)
      const dados = []
      $('div[class="lyric-cnt g-1"] > *').each((i, e) => {
        dados.push($(e).text().trim())
      })
      resolve({status: res.status, linkMusic: queryUrl, LetraDaMusica: dados})
    })
    .catch(e => {
      reject(e)
    })
  })
}

const playStoreSearch = (query) => new Promise((resolve, reject) => {
  axios.get(`https://play.google.com/store/search?q=${query}&c=apps`, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    }
  })
  .then((res) => {
    const $ = cheerio.load(res.data);
    const dados = [];
    $('.VfPpkd-aGsRMb').each((i, e) => {
      dados.push({
        nome: $(e).find('.DdYX5:first').text(),
        imagem: ($(e).find('img:first').attr('srcset') ? (linkfy.find($(e).find('img:first').attr('srcset'))?.pop()?.href || $(e).find('img:first').attr('src')) : $(e).find('img:first').attr('srcset')) || $(e).find('img:last').attr('srcset') ? (linkfy.find($(e).find('img:last').attr('srcset'))?.pop()?.href || $(e).find('img:last').attr('src')) : $(e).find('img:last').attr('srcset'),
        desenvolvedor: $(e).find('.wMUdtb:first').text(),
        estrelas: $(e).find('.w2kbF:first').text(),
        link: 'https://play.google.com' + $(e).find('a:first').attr('href')
      })
    })
    resolve({status: res.status, autor: '+55 94 9147-2796', resultado: dados})
  })
  .catch(e => reject(e))
})

const sambaPornoSearch = (q) => new Promise((resolve, reject) => {
  axios.get(`https://www.sambaporno.com/search/${encodeUrl(q)}`, {
    headers: {
      "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36"
    }
  })
  .then((res) => {
    const $ = cheerio.load(res.data);
    const dados = [];
    $('div[class="card-container sub "]').each((i, e) => {
      dados.push({
        nome: $(e).find('.title:first').text().trim(),
        imagem: $(e).find('img:first').attr('src').trim(),
        gostei: $(e).find('span[class="badge rating-procent text-success"]').text().trim(),
        duracao: $(e).find('span[class="duration badge bg-dark"]').text(),
        link: 'https://www.sambaporno.com' + $(e).find('a:first').attr('href')
      })
    })
    resolve({status: res.status, autor: '+55 94 9147-2796', resultado: dados})
  })
  .catch(e => {
    reject(e)
  })
})
module.exports = { geturl, pensador, styletext, getgrupos, gpwhatsapp, hentaistube, nerding, apkmodhacker, uptodown, pornhub, st, gpsrc, igstalk, ff, papeldeparede, htdl, assistithtdl, assistitht, pornogratis, wallmob, pinterest, rastrear,xvideos, xvideos1, soundl, rastrearEncomendas, dafontDownload, dafontSearch, xvideosPorno, dicionarioNome, XvideosSearch, XvideosDL, buscarMenoresPrecos, XnxxDL, XnxxSearch,  sambaPornoSearch,
  playStoreSearch,
  letrasMusica,
  amazonSearch,
  partidoDosTrouxas,
  partidoLiberal,
  memesDroid,
  animesGoyabu,
  animesGoyabu2,
  gruposZap,
  iFunny,
  hentaiimg,
  fraseAmor,
  frasesPensador,
  animesBrSearch,
  ultimasNoticias,
  mercadoLivreSearch,
  xvideosSearch,
  hentaivid,
  xvideosDownloader,
  topFlixDL,
  pinterestVideo,
  pinterestVideoV2,
  ultimasNoticias,
  uptodownsrc,
  uptodowndl, 
  teste, animesFireEps, 
  animeFireDownload, 
  mediafireDl,
  randomGrupos,
  hentai, 
  twitter, 
  quotesAnime,
  wallpaper2,
  hentaihome, 
  lojadomecanico,
  wallpaper,
  wikimedia, 
  styletext,
 LetradaMusica,
 snapsave,
 searching, 
 spotifydl,
 photooxy
 
 };
