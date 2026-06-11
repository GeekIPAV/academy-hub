const COUNTRY_CODES = [
  "AF","ZA","AL","DE","AD","AO","AI","AQ","AG","SA","DZ","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BE","BZ","BJ","BM","BY","BO","BQ","BA","BW","BR","BN","BG","BF","BI","BT","CV","KH","CM","CA","QA","KZ","TD","CL","CN","CY","CO","KM","CG","CD","KP","KR","CI","CR","HR","CU","CW","DK","DJ","DM","EG","SV","AE","EC","ER","SK","SI","ES","US","EE","ET","FJ","PH","FI","FR","GA","GM","GH","GE","GS","GI","GD","GR","GL","GP","GU","GT","GG","GY","GF","GN","GQ","GW","HT","HN","HK","HU","YE","BV","CX","AC","IM","NF","AX","KY","CC","CK","FO","HM","FK","MP","MH","UM","PN","SB","TC","VG","VI","IN","ID","IR","IQ","IE","IS","IL","IT","JM","JP","JE","JO","XK","KW","LA","LS","LV","LB","LR","LY","LI","LT","LU","MO","MK","MG","MY","MW","MV","ML","MT","MA","MQ","MU","MR","YT","MX","FM","MZ","MD","MC","MN","ME","MS","MM","NA","NR","NP","NI","NE","NG","NU","NO","NC","NZ","OM","NL","PW","PS","PA","PG","PK","PY","PE","PF","PL","PR","PT","KE","KG","KI","GB","CF","CZ","DO","RE","RO","RW","EH","BL","SH","LC","MF","PM","WS","AS","SM","ST","VC","SC","SN","SL","RS","SG","SX","SY","SO","LK","SZ","SD","SS","SE","CH","SR","SJ","TH","TW","TJ","TZ","IO","TF","TL","TG","TK","TO","TT","TN","TM","TR","TV","UA","UG","UY","UZ","VU","VA","VE","VN","WF","ZM","ZW"
] as const;

export const COUNTRY_OPTIONS = COUNTRY_CODES
  .map((code) => new Intl.DisplayNames(["pt"], { type: "region" }).of(code) ?? code)
  .sort((a, b) => a.localeCompare(b, "pt"));

export const PORTUGUESE_MUNICIPALITIES = [
  "Abrantes","Águeda","Aguiar da Beira","Alandroal","Albergaria-a-Velha","Albufeira","Alcácer do Sal","Alcanena","Alcobaça","Alcochete","Alcoutim","Alenquer","Alfândega da Fé","Alijó","Aljezur","Aljustrel","Almada","Almeida","Almeirim","Almodôvar","Alpiarça","Alter do Chão","Alvaiázere","Alvito","Amadora","Amarante","Amares","Anadia","Angra do Heroísmo","Ansião","Arcos de Valdevez","Arganil","Armamar","Arouca","Arraiolos","Arronches","Arruda dos Vinhos","Aveiro","Avis","Azambuja","Baião","Barcelos","Barrancos","Barreiro","Batalha","Beja","Belmonte","Benavente","Bombarral","Borba","Boticas","Braga","Bragança","Cabeceiras de Basto","Cadaval","Caldas da Rainha","Calheta","Câmara de Lobos","Caminha","Campo Maior","Cantanhede","Carrazeda de Ansiães","Carregal do Sal","Cartaxo","Cascais","Castanheira de Pera","Castelo Branco","Castelo de Paiva","Castelo de Vide","Castro Daire","Castro Marim","Castro Verde","Celorico da Beira","Celorico de Basto","Chamusca","Chaves","Cinfães","Coimbra","Condeixa-a-Nova","Constância","Coruche","Corvo","Covilhã","Crato","Cuba","Elvas","Entroncamento","Espinho","Esposende","Estarreja","Estremoz","Évora","Fafe","Faro","Felgueiras","Ferreira do Alentejo","Ferreira do Zêzere","Figueira da Foz","Figueira de Castelo Rodrigo","Figueiró dos Vinhos","Fornos de Algodres","Freixo de Espada à Cinta","Fronteira","Funchal","Fundão","Gavião","Góis","Golegã","Gondomar","Gouveia","Grândola","Guarda","Guimarães","Horta","Idanha-a-Nova","Ílhavo","Lagoa","Lagos","Lajes das Flores","Lajes do Pico","Lamego","Leiria","Lisboa","Loulé","Loures","Lourinhã","Lousã","Lousada","Mação","Macedo de Cavaleiros","Machico","Madalena","Mafra","Maia","Mangualde","Manteigas","Marco de Canaveses","Marinha Grande","Marvão","Matosinhos","Mealhada","Mêda","Melgaço","Mértola","Mesão Frio","Mira","Miranda do Corvo","Miranda do Douro","Mirandela","Mogadouro","Moimenta da Beira","Moita","Monção","Monchique","Mondim de Basto","Monforte","Montalegre","Montemor-o-Novo","Montemor-o-Velho","Montijo","Mora","Mortágua","Moura","Mourão","Murça","Murtosa","Nazaré","Nelas","Nisa","Nordeste","Óbidos","Odemira","Odivelas","Oeiras","Oleiros","Olhão","Oliveira de Azeméis","Oliveira de Frades","Oliveira do Bairro","Oliveira do Hospital","Ourém","Ourique","Ovar","Paços de Ferreira","Palmela","Pampilhosa da Serra","Paredes","Paredes de Coura","Pedrógão Grande","Penacova","Penafiel","Penalva do Castelo","Penamacor","Penedono","Penela","Peniche","Peso da Régua","Pinhel","Pombal","Ponta Delgada","Ponta do Sol","Ponte da Barca","Ponte de Lima","Ponte de Sor","Portalegre","Portel","Portimão","Porto","Porto de Mós","Porto Moniz","Porto Santo","Póvoa de Lanhoso","Póvoa de Varzim","Povoação","Praia da Vitória","Proença-a-Nova","Redondo","Reguengos de Monsaraz","Resende","Ribeira Brava","Ribeira de Pena","Ribeira Grande","Rio Maior","Sabrosa","Sabugal","Salvaterra de Magos","Santa Comba Dão","Santa Cruz","Santa Cruz da Graciosa","Santa Cruz das Flores","Santa Maria da Feira","Santa Marta de Penaguião","Santana","Santarém","Santiago do Cacém","Santo Tirso","São Brás de Alportel","São João da Madeira","São João da Pesqueira","São Pedro do Sul","São Roque do Pico","São Vicente","Sardoal","Sátão","Seia","Seixal","Sernancelhe","Serpa","Sertã","Sesimbra","Setúbal","Sever do Vouga","Silves","Sines","Sintra","Sobral de Monte Agraço","Soure","Sousel","Tábua","Tabuaço","Tarouca","Tavira","Terras de Bouro","Tomar","Tondela","Torre de Moncorvo","Torres Novas","Torres Vedras","Trancoso","Trofa","Vagos","Vale de Cambra","Valença","Valongo","Valpaços","Velas","Vendas Novas","Viana do Alentejo","Viana do Castelo","Vidigueira","Vieira do Minho","Vila de Rei","Vila do Bispo","Vila do Conde","Vila do Porto","Vila Flor","Vila Franca de Xira","Vila Franca do Campo","Vila Nova da Barquinha","Vila Nova de Cerveira","Vila Nova de Famalicão","Vila Nova de Foz Côa","Vila Nova de Gaia","Vila Nova de Paiva","Vila Nova de Poiares","Vila Pouca de Aguiar","Vila Real","Vila Real de Santo António","Vila Velha de Ródão","Vila Verde","Vila Viçosa","Vimioso","Vinhais","Viseu","Vizela","Vouzela"
];

export function isValidNif(value: string) {
  const nif = value.replace(/\D/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  const first = Number(nif[0]);
  if (![1, 2, 3, 5, 6, 7, 8, 9].includes(first)) return false;
  const sum = nif
    .slice(0, 8)
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * (9 - index), 0);
  const check = 11 - (sum % 11);
  return Number(nif[8]) === (check >= 10 ? 0 : check);
}

export function isOlderThanTwoYears(value: string) {
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 2);
  return birth <= limit;
}

export function isValidPhone(value: string | null | undefined) {
  const phone = (value ?? "").trim();
  if (!phone) return true;
  return /^(?:\+351)?9\d{8}$/.test(phone.replace(/[\s.-]/g, ""));
}