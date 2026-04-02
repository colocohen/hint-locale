/**
 * HintLocale v2.2.0
 * Client-side locale detection with confidence scoring.
 * Works in browsers and Node.js (single UMD file).
 *
 * Signals used:
 *   1. navigator.languages  → explicit region subtags + language codes
 *   2. Intl timezone        → country narrowing
 *   3. Language rarity       → rare language = stronger country signal
 *   4. Primary vs secondary  → "he" is primary in IL, "en" is secondary
 *
 * @license MIT
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.HintLocale = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ─────────────────────────────────────────────
  //  PACKED DATA
  //
  //  Countries: "CC,numeric,calling,lang1.lang2.lang3" joined by "|"
  //             First language = primary language of that country.
  //
  //  Timezones: "tzName>CC1.CC2;tzName2>CC3" — inverted index,
  //             no duplication of tz strings per country.
  // ─────────────────────────────────────────────

  var CP = "AD,20,376,ca|AE,784,971,ar.fa.en.hi.ur|AF,4,93,fa.ps.uz.tk|AG,28,0,en|AI,660,0,en|AL,8,355,sq.el|AM,51,374,hy|AO,24,244,pt|AQ,10,0,|AR,32,54,es.en.it.de.fr.gn|AS,16,0,en.sm.to|AT,40,43,de.hr.hu.sl|AU,36,61,en|AW,533,297,nl.pap.es.en|AX,248,0,sv|AZ,31,994,az.ru.hy|BA,70,387,bs.hr.sr|BB,52,0,en|BD,50,880,bn.en|BE,56,32,nl.fr.de|BF,854,226,fr|BG,100,359,bg.tr|BH,48,973,ar.en.fa.ur|BI,108,257,fr.rn|BJ,204,229,fr|BL,652,590,fr|BM,60,0,en.pt|BN,96,673,ms.en|BO,68,591,es.qu.ay|BQ,535,599,nl.pap.en|BR,76,55,pt.es.en.fr|BS,44,0,en|BT,64,975,dz|BW,72,267,en.tn|BY,112,375,be.ru|BZ,84,501,en.es|CA,124,1,en.fr.iu|CC,166,61,ms.en|CD,180,243,fr.ln.kg.sw|CF,140,236,fr.sg.ln.kg|CG,178,242,fr.kg.ln|CH,756,41,de.fr.it.rm|CI,384,225,fr|CK,184,682,en.mi|CL,152,56,es|CM,120,237,en.fr|CN,156,86,zh|CO,170,57,es|CR,188,506,es.en|CU,192,53,es|CV,132,238,pt|CW,531,599,nl.pap|CX,162,61,en.zh.ms|CY,196,357,el.tr.en|CZ,203,420,cs.sk|DE,276,49,de|DJ,262,253,fr.ar.so.aa|DK,208,45,da.en.fo.de|DM,212,0,en|DO,214,809,es|DZ,12,213,ar|EC,218,593,es|EE,233,372,et.ru|EG,818,20,ar.en.fr|EH,732,212,ar|ER,232,291,aa.ar.ti|ES,724,34,es.ca.gl.eu.oc|ET,231,251,am.en.om.ti.so|FI,246,358,fi.sv|FJ,242,679,en.fj|FK,238,500,en|FM,583,691,en|FO,234,298,fo.da|FR,250,33,fr.br.co.ca.eu.oc|GA,266,241,fr|GB,826,44,en.cy.gd|GD,308,0,en|GE,268,995,ka.ru.hy.az|GF,254,594,fr|GG,831,0,en|GH,288,233,en.ak.ee.tw|GI,292,350,en.es.it.pt|GL,304,299,kl.da.en|GM,270,220,en.wo.ff|GN,324,224,fr|GP,312,590,fr|GQ,226,240,es.fr|GR,300,30,el.en.fr|GS,239,0,en|GT,320,502,es|GU,316,0,en.ch|GW,624,245,pt|GY,328,592,en|HK,344,852,zh.en|HN,340,504,es|HR,191,385,hr.sr|HT,332,509,ht.fr|HU,348,36,hu|ID,360,62,id.en.nl.jv|IE,372,353,en.ga|IL,376,972,he.ar.en|IM,833,0,en.gv|IN,356,91,en.hi.bn.te.mr.ta.ur.gu.kn.ml.or.pa.as.ks.ne.sd.sa|IO,86,246,en|IQ,368,964,ar.ku.hy|IR,364,98,fa.ku|IS,352,354,is.en.de.da.sv.no|IT,380,39,it.de.fr.sc.ca.co.sl|JE,832,0,en.fr|JM,388,0,en|JO,400,962,ar.en|JP,392,81,ja|KE,404,254,en.sw|KG,417,996,ky.uz.ru|KH,116,855,km.fr.en|KI,296,686,en|KM,174,269,ar.fr|KN,659,0,en|KP,408,850,ko|KR,410,82,ko.en|KW,414,965,ar.en|KY,136,0,en|KZ,398,7,kk.ru|LA,418,856,lo.fr.en|LB,422,961,ar.fr.en.hy|LC,662,0,en|LI,438,423,de|LK,144,94,si.ta.en|LR,430,231,en|LS,426,266,en.st.zu.xh|LT,440,370,lt.ru.pl|LU,442,352,lb.de.fr|LV,428,371,lv.ru.lt|LY,434,218,ar.it.en|MA,504,212,ar.fr|MC,492,377,fr.en.it|MD,498,373,ro.ru|ME,499,382,sr.hu.bs.sq.hr|MF,663,590,fr|MG,450,261,fr.mg|MH,584,692,en|MK,807,389,mk.sq.tr.sr|ML,466,223,fr.bm|MM,104,95,my|MN,496,976,mn.ru|MO,446,853,zh.pt|MP,580,0,en.zh.ch|MQ,474,596,fr|MR,478,222,ar.fr.wo|MS,500,0,en|MT,470,356,mt.en|MU,480,230,en.fr|MV,462,960,dv.en|MW,454,265,ny|MX,484,52,es|MY,458,60,ms.en.zh.ta.te.ml.pa.th|MZ,508,258,pt|NA,516,264,en.af.de|NC,540,687,fr|NE,562,227,fr.ha|NF,574,672,en|NG,566,234,en.ha.yo.ig.ff|NI,558,505,es.en|NL,528,31,nl.fy|NO,578,47,no.nb.nn.se.fi|NP,524,977,ne.en|NR,520,674,na.en|NU,570,683,en|NZ,554,64,en.mi|OM,512,968,ar.en|PA,591,507,es.en|PE,604,51,es.qu.ay|PF,258,689,fr|PG,598,675,en|PH,608,63,tl.en|PK,586,92,ur.en.pa.sd.ps|PL,616,48,pl|PM,666,508,fr|PN,612,870,en|PR,630,1,en.es|PS,275,970,ar|PT,620,351,pt|PW,585,680,en.ja.zh|PY,600,595,es.gn|QA,634,974,ar.es|RE,638,262,fr|RO,642,40,ro.hu|RS,688,381,sr.hu.bs|RU,643,7,ru.tt.ce.cv.ba.sah|RW,646,250,rw.en.fr.sw|SA,682,966,ar|SB,90,677,en|SC,690,248,en.fr|SD,729,249,ar.en|SE,752,46,sv.se.fi|SG,702,65,en.ms.ta.zh|SH,654,290,en|SI,705,386,sl|SJ,744,47,no.ru|SK,703,421,sk.hu|SL,694,232,en|SM,674,378,it|SN,686,221,fr.wo|SO,706,252,so.ar.it.en|SR,740,597,nl.en|SS,728,211,en|ST,678,239,pt|SV,222,503,es|SX,534,599,nl.en|SY,760,963,ar.ku.hy.fr.en|SZ,748,268,en.ss|TC,796,0,en|TD,148,235,fr.ar|TF,260,0,fr|TG,768,228,fr.ee.ha|TH,764,66,th.en|TJ,762,992,tg.ru|TK,772,690,en|TL,626,670,pt.id.en|TM,795,993,tk.ru.uz|TN,788,216,ar.fr|TO,776,676,to.en|TR,792,90,tr.ku.az|TT,780,0,en.es.zh|TV,798,688,en|TW,158,886,zh|TZ,834,255,sw.en.ar|UA,804,380,uk.ru.pl.hu|UG,800,256,en.lg.sw.ar|UM,581,1,en|US,840,1,en.es.haw.fr|UY,858,598,es|UZ,860,998,uz.ru.tg|VA,336,379,la.it.fr|VC,670,0,en.fr|VE,862,58,es|VG,92,0,en|VI,850,0,en|VN,704,84,vi.en.fr.zh.km|VU,548,678,bi.en.fr|WF,876,681,fr|WS,882,685,sm.en|YE,887,967,ar|YT,175,262,fr|ZA,710,27,zu.xh.af.en.tn.st.ts.ss.ve.nr|ZM,894,260,en.ny|ZW,716,263,en.sn.nr.nd";

  var TP = "Africa/Abidjan>CI;Africa/Accra>GH;Africa/Addis_Ababa>ET;Africa/Algiers>DZ;Africa/Asmara>ER;Africa/Bamako>ML;Africa/Bangui>CF;Africa/Banjul>GM;Africa/Bissau>GW;Africa/Blantyre>MW;Africa/Brazzaville>CG;Africa/Bujumbura>BI;Africa/Cairo>EG;Africa/Casablanca>MA;Africa/Ceuta>ES;Africa/Conakry>GN;Africa/Dakar>SN;Africa/Dar_es_Salaam>TZ;Africa/Djibouti>DJ;Africa/Douala>CM;Africa/El_Aaiun>EH;Africa/Freetown>SL;Africa/Gaborone>BW;Africa/Harare>ZW;Africa/Johannesburg>ZA;Africa/Juba>SS;Africa/Kampala>UG;Africa/Khartoum>SD;Africa/Kigali>RW;Africa/Kinshasa>CD;Africa/Lagos>NG;Africa/Libreville>GA;Africa/Lome>TG;Africa/Luanda>AO;Africa/Lubumbashi>CD;Africa/Lusaka>ZM;Africa/Malabo>GQ;Africa/Maputo>MZ;Africa/Maseru>LS;Africa/Mbabane>SZ;Africa/Mogadishu>SO;Africa/Monrovia>LR;Africa/Nairobi>KE;Africa/Ndjamena>TD;Africa/Niamey>NE;Africa/Nouakchott>MR;Africa/Ouagadougou>BF;Africa/Porto-Novo>BJ;Africa/Sao_Tome>ST;Africa/Timbuktu>CI;Africa/Tripoli>LY;Africa/Tunis>TN;Africa/Windhoek>NA;America/Adak>US;America/Anchorage>US;America/Anguilla>AI;America/Antigua>AG;America/Araguaina>BR;America/Argentina/Buenos_Aires>AR;America/Argentina/Catamarca>AR;America/Argentina/ComodRivadavia>AR;America/Argentina/Cordoba>AR;America/Argentina/Jujuy>AR;America/Argentina/La_Rioja>AR;America/Argentina/Mendoza>AR;America/Argentina/Rio_Gallegos>AR;America/Argentina/Salta>AR;America/Argentina/San_Juan>AR;America/Argentina/San_Luis>AR;America/Argentina/Tucuman>AR;America/Argentina/Ushuaia>AR;America/Aruba>AW;America/Asuncion>PY;America/Atikokan>CA;America/Atka>US;America/Bahia>BR;America/Bahia_Banderas>MX;America/Barbados>BB;America/Belem>BR;America/Belize>BZ;America/Blanc-Sablon>CA;America/Boa_Vista>BR;America/Bogota>CO;America/Boise>US;America/Buenos_Aires>AR;America/Cambridge_Bay>CA;America/Campo_Grande>BR;America/Cancun>MX;America/Caracas>VE;America/Catamarca>AR;America/Cayenne>GF;America/Cayman>KY;America/Chicago>US;America/Chihuahua>MX;America/Coral_Harbour>CA;America/Cordoba>AR;America/Costa_Rica>CR;America/Creston>CA;America/Cuiaba>BR;America/Curacao>CW;America/Danmarkshavn>GL;America/Dawson>CA;America/Dawson_Creek>CA;America/Denver>US;America/Detroit>US;America/Dominica>DM;America/Edmonton>CA;America/Eirunepe>BR;America/El_Salvador>SV;America/Ensenada>MX;America/Fort_Nelson>CA;America/Fort_Wayne>US;America/Fortaleza>BR;America/Glace_Bay>CA;America/Godthab>GL;America/Goose_Bay>CA;America/Grand_Turk>TC;America/Grenada>GD;America/Guadeloupe>GP;America/Guatemala>GT;America/Guayaquil>EC;America/Guyana>GY;America/Halifax>CA;America/Havana>CU;America/Hermosillo>MX;America/Indiana/Indianapolis>US;America/Indiana/Knox>US;America/Indiana/Marengo>US;America/Indiana/Petersburg>US;America/Indiana/Tell_City>US;America/Indiana/Vevay>US;America/Indiana/Vincennes>US;America/Indiana/Winamac>US;America/Indianapolis>US;America/Inuvik>CA;America/Iqaluit>CA;America/Jamaica>JM;America/Jujuy>AR;America/Juneau>US;America/Kentucky/Louisville>US;America/Kentucky/Monticello>US;America/Knox_IN>US;America/Kralendijk>BQ;America/La_Paz>BO;America/Lima>PE;America/Los_Angeles>US;America/Louisville>US;America/Lower_Princes>SX;America/Maceio>BR;America/Managua>NI;America/Manaus>BR;America/Marigot>MF;America/Martinique>MQ;America/Matamoros>MX;America/Mazatlan>MX;America/Mendoza>AR;America/Menominee>US;America/Merida>MX;America/Metlakatla>US;America/Mexico_City>MX;America/Miquelon>PM;America/Moncton>CA;America/Monterrey>MX;America/Montevideo>UY;America/Montreal>CA;America/Montserrat>MS;America/Nassau>BS;America/New_York>US;America/Nipigon>CA;America/Nome>US;America/Noronha>BR;America/North_Dakota/Beulah>US;America/North_Dakota/Center>US;America/North_Dakota/New_Salem>US;America/Nuuk>GL;America/Ojinaga>MX;America/Panama>PA;America/Pangnirtung>CA;America/Paramaribo>SR;America/Phoenix>US;America/Port-au-Prince>HT;America/Port_of_Spain>TT;America/Porto_Acre>BR;America/Porto_Velho>BR;America/Puerto_Rico>PR;America/Punta_Arenas>CL;America/Rainy_River>CA;America/Rankin_Inlet>CA;America/Recife>BR;America/Regina>CA;America/Resolute>CA;America/Rio_Branco>BR;America/Rosario>AR;America/Santa_Isabel>MX;America/Santarem>BR;America/Santiago>CL;America/Santo_Domingo>DO;America/Sao_Paulo>BR;America/Scoresbysund>GL;America/Shiprock>US;America/Sitka>US;America/St_Barthelemy>BL;America/St_Johns>CA;America/St_Kitts>KN;America/St_Lucia>LC;America/St_Thomas>VI;America/St_Vincent>VC;America/Swift_Current>CA;America/Tegucigalpa>HN;America/Thule>GL;America/Thunder_Bay>CA;America/Tijuana>MX;America/Toronto>CA;America/Tortola>VG;America/Vancouver>CA;America/Virgin>TT;America/Whitehorse>CA;America/Winnipeg>CA;America/Yakutat>US;America/Yellowknife>CA;Antarctica/Casey>AQ;Antarctica/Davis>AQ;Antarctica/DumontDUrville>AQ;Antarctica/Macquarie>AU;Antarctica/Mawson>AQ;Antarctica/McMurdo>AQ;Antarctica/Palmer>AQ;Antarctica/Rothera>AQ;Antarctica/South_Pole>NZ;Antarctica/Syowa>AQ;Antarctica/Troll>AQ;Antarctica/Vostok>AQ;Arctic/Longyearbyen>SJ;Asia/Aden>YE;Asia/Almaty>KZ;Asia/Amman>JO;Asia/Anadyr>RU;Asia/Aqtau>KZ;Asia/Aqtobe>KZ;Asia/Ashgabat>TM;Asia/Ashkhabad>TM;Asia/Atyrau>KZ;Asia/Baghdad>IQ;Asia/Bahrain>BH;Asia/Baku>AZ;Asia/Bangkok>TH;Asia/Barnaul>RU;Asia/Beirut>LB;Asia/Bishkek>KG;Asia/Brunei>BN;Asia/Calcutta>IN;Asia/Chita>RU;Asia/Choibalsan>MN;Asia/Chongqing>CN;Asia/Chungking>CN;Asia/Colombo>LK;Asia/Dacca>BD;Asia/Damascus>SY;Asia/Dhaka>BD;Asia/Dili>TL;Asia/Dubai>AE;Asia/Dushanbe>TJ;Asia/Famagusta>CY;Asia/Gaza>PS;Asia/Harbin>CN;Asia/Hebron>PS;Asia/Ho_Chi_Minh>VN;Asia/Hong_Kong>HK;Asia/Hovd>MN;Asia/Irkutsk>RU;Asia/Istanbul>TR;Asia/Jakarta>ID;Asia/Jayapura>ID;Asia/Jerusalem>IL;Asia/Kabul>AF;Asia/Kamchatka>RU;Asia/Karachi>PK;Asia/Kashgar>CN;Asia/Kathmandu>NP;Asia/Katmandu>NP;Asia/Khandyga>RU;Asia/Kolkata>IN;Asia/Krasnoyarsk>RU;Asia/Kuala_Lumpur>MY;Asia/Kuching>MY;Asia/Kuwait>KW;Asia/Macao>MO;Asia/Macau>MO;Asia/Magadan>RU;Asia/Makassar>ID;Asia/Manila>PH;Asia/Muscat>OM;Asia/Nicosia>CY;Asia/Novokuznetsk>RU;Asia/Novosibirsk>RU;Asia/Omsk>RU;Asia/Oral>KZ;Asia/Phnom_Penh>KH;Asia/Pontianak>ID;Asia/Pyongyang>KP;Asia/Qatar>QA;Asia/Qostanay>KZ;Asia/Qyzylorda>KZ;Asia/Rangoon>MM;Asia/Riyadh>SA;Asia/Saigon>VN;Asia/Sakhalin>RU;Asia/Samarkand>UZ;Asia/Seoul>KR;Asia/Shanghai>CN;Asia/Singapore>SG;Asia/Srednekolymsk>RU;Asia/Taipei>TW;Asia/Tashkent>UZ;Asia/Tbilisi>GE;Asia/Tehran>IR;Asia/Tel_Aviv>IL;Asia/Thimbu>BT;Asia/Thimphu>BT;Asia/Tokyo>JP;Asia/Tomsk>RU;Asia/Ujung_Pandang>ID;Asia/Ulaanbaatar>MN;Asia/Ulan_Bator>MN;Asia/Urumqi>CN;Asia/Ust-Nera>RU;Asia/Vientiane>LA;Asia/Vladivostok>RU;Asia/Yakutsk>RU;Asia/Yangon>MM;Asia/Yekaterinburg>RU;Asia/Yerevan>AM;Atlantic/Azores>PT;Atlantic/Bermuda>BM;Atlantic/Canary>ES;Atlantic/Cape_Verde>CV;Atlantic/Faeroe>FO;Atlantic/Faroe>FO;Atlantic/Jan_Mayen>NO;Atlantic/Madeira>PT;Atlantic/Reykjavik>IS;Atlantic/South_Georgia>GS;Atlantic/St_Helena>SH;Atlantic/Stanley>FK;Australia/ACT>AU;Australia/Adelaide>AU;Australia/Brisbane>AU;Australia/Broken_Hill>AU;Australia/Canberra>AU;Australia/Currie>AU;Australia/Darwin>AU;Australia/Eucla>AU;Australia/Hobart>AU;Australia/LHI>AU;Australia/Lindeman>AU;Australia/Lord_Howe>AU;Australia/Melbourne>AU;Australia/NSW>AU;Australia/North>AU;Australia/Perth>AU;Australia/Queensland>AU;Australia/South>AU;Australia/Sydney>AU;Australia/Tasmania>AU;Australia/Victoria>AU;Australia/West>AU;Australia/Yancowinna>AU;Brazil/Acre>BR;Brazil/DeNoronha>BR;Brazil/East>BR;Brazil/West>BR;Canada/Atlantic>CA;Canada/Central>CA;Canada/Eastern>CA;Canada/Mountain>CA;Canada/Newfoundland>CA;Canada/Pacific>CA;Canada/Saskatchewan>CA;Canada/Yukon>CA;Chile/Continental>CL;Chile/EasterIsland>CL;Cuba>CU;Egypt>EG;Eire>IE;Europe/Amsterdam>NL;Europe/Andorra>AD;Europe/Astrakhan>RU;Europe/Athens>GR;Europe/Belfast>GB;Europe/Belgrade>RS;Europe/Berlin>DE;Europe/Bratislava>SK;Europe/Brussels>BE;Europe/Bucharest>RO;Europe/Budapest>HU;Europe/Busingen>DE;Europe/Chisinau>MD;Europe/Copenhagen>DK;Europe/Dublin>IE;Europe/Gibraltar>GI;Europe/Guernsey>GG;Europe/Helsinki>FI;Europe/Isle_of_Man>IM;Europe/Istanbul>TR;Europe/Jersey>JE;Europe/Kaliningrad>RU;Europe/Kiev>UA;Europe/Kirov>RU;Europe/Lisbon>PT;Europe/Ljubljana>SI;Europe/London>GB;Europe/Luxembourg>LU;Europe/Madrid>ES;Europe/Malta>MT;Europe/Mariehamn>AX;Europe/Minsk>BY;Europe/Monaco>MC;Europe/Moscow>RU;Europe/Nicosia>CY;Europe/Oslo>NO;Europe/Paris>FR;Europe/Podgorica>ME;Europe/Prague>CZ;Europe/Riga>LV;Europe/Rome>IT;Europe/Samara>RU;Europe/San_Marino>SM;Europe/Sarajevo>BA;Europe/Saratov>RU;Europe/Simferopol>UA;Europe/Skopje>MK;Europe/Sofia>BG;Europe/Stockholm>SE;Europe/Tallinn>EE;Europe/Tirane>AL;Europe/Tiraspol>MD;Europe/Ulyanovsk>RU;Europe/Uzhgorod>UA;Europe/Vaduz>LI;Europe/Vatican>VA;Europe/Vienna>AT;Europe/Vilnius>LT;Europe/Volgograd>RU;Europe/Warsaw>PL;Europe/Zagreb>HR;Europe/Zaporozhye>UA;Europe/Zurich>CH;GB>GB;GB-Eire>GB;Hongkong>HK;Iceland>IS;Indian/Antananarivo>MG;Indian/Chagos>IO;Indian/Christmas>CX;Indian/Cocos>CC;Indian/Comoro>KM;Indian/Kerguelen>TF;Indian/Mahe>SC;Indian/Maldives>MV;Indian/Mauritius>MU;Indian/Mayotte>YT;Indian/Reunion>RE;Iran>IR;Israel>IL;Jamaica>JM;Japan>JP;Kwajalein>MH;Libya>LY;Mexico/BajaNorte>MX;Mexico/BajaSur>MX;Mexico/General>MX;NZ>NZ;NZ-CHAT>NZ;Navajo>US;PRC>CN;Pacific/Apia>WS;Pacific/Auckland>NZ;Pacific/Bougainville>PG;Pacific/Chatham>NZ;Pacific/Chuuk>FM;Pacific/Easter>CL;Pacific/Efate>VU;Pacific/Enderbury>KI;Pacific/Fakaofo>TK;Pacific/Fiji>FJ;Pacific/Funafuti>TV;Pacific/Galapagos>EC;Pacific/Gambier>PF;Pacific/Guadalcanal>SB;Pacific/Guam>GU;Pacific/Honolulu>US;Pacific/Johnston>US;Pacific/Kiritimati>KI;Pacific/Kosrae>FM;Pacific/Kwajalein>MH;Pacific/Majuro>MH;Pacific/Marquesas>PF;Pacific/Midway>UM;Pacific/Nauru>NR;Pacific/Niue>NU;Pacific/Norfolk>NF;Pacific/Noumea>NC;Pacific/Pago_Pago>AS;Pacific/Palau>PW;Pacific/Pitcairn>PN;Pacific/Pohnpei>FM;Pacific/Ponape>FM;Pacific/Port_Moresby>PG;Pacific/Rarotonga>CK;Pacific/Saipan>MP;Pacific/Samoa>AS;Pacific/Tahiti>PF;Pacific/Tarawa>KI;Pacific/Tongatapu>TO;Pacific/Truk>FM;Pacific/Wake>UM;Pacific/Wallis>WF;Pacific/Yap>FM;Poland>PL;Portugal>PT;ROC>TW;ROK>KR;Turkey>TR;US/Alaska>US;US/Aleutian>US;US/Arizona>US;US/Central>US;US/East-Indiana>US;US/Eastern>US;US/Hawaii>US;US/Indiana-Starke>US;US/Michigan>US;US/Mountain>US;US/Pacific>US;US/Pacific-New>US;US/Samoa>AS;W-SU>RU";

  var LN = "aa:Qafaraf,af:Afrikaans,ak:Akan,sq:shqip,am:አማርኛ,ar:العربية,hy:հայերեն,as:অসমীয়া,az:azərbaycan,bm:bamanakan,eu:euskara,be:беларуская,bn:বাংলা,bs:bosanski,br:brezhoneg,bg:български,my:ဗမာ,ca:català,zh:中文,cs:čeština,da:dansk,nl:Nederlands,dz:རྫོང་ཁ,en:English,eo:esperanto,et:eesti,ee:eʋegbe,fo:føroyskt,fi:suomi,fr:français,fy:West-Frysk,ff:Pulaar,ka:ქართული,de:Deutsch,gd:Gàidhlig,ga:Gaeilge,gl:galego,gv:Gaelg,el:Ελληνικά,gu:ગુજરાતી,ha:Hausa,he:עברית,hi:हिंदी,hr:hrvatski,hu:magyar,ig:Igbo,is:íslenska,id:Bahasa Indonesia,it:italiano,ja:日本語,kl:kalaallisut,kn:ಕನ್ನಡ,ks:کٲشُر,kk:қазақ тілі,km:ខ្មែរ,ki:Gikuyu,rw:Kinyarwanda,ky:кыргызча,ko:한국어,lo:ລາວ,lv:latviešu,ln:lingála,lt:lietuvių,lb:Lëtzebuergesch,lu:Tshiluba,lg:Luganda,mk:македонски,ml:മലയാളം,mr:मराठी,ms:Bahasa Melayu,mg:Malagasy,mt:Malti,mn:монгол,nd:isiNdebele,ne:नेपाली,nn:nynorsk,nb:norsk bokmål,no:Norwegian,or:ଓଡ଼ିଆ,om:Oromoo,os:ирон,pa:ਪੰਜਾਬੀ,fa:فارسی,pl:polski,pt:português,ps:پښتو,qu:Runasimi,rm:rumantsch,ro:română,rn:Ikirundi,ru:русский,sg:Sängö,si:සිංහල,sk:slovenčina,sl:slovenščina,se:davvisámegiella,sn:chiShona,so:Soomaali,es:español,sr:српски,sw:Kiswahili,sv:svenska,ta:தமிழ்,te:తెలుగు,tl:Tagalog,th:ไทย,bo:བོད་སྐད་,ti:ትግርኛ,to:lea fakatonga,tr:Türkçe,ug:ئۇيغۇرچە,uk:українська,ur:اردو,uz:oʻzbekcha,vi:Tiếng Việt,cy:Cymraeg,yi:ייִדיש,yo:Èdè Yorùbá,zu:isiZulu,dv:ދިވެހި,ht:Kreyòl ayisyen,haw:ʻŌlelo Hawaiʻi,la:Latina,sa:संस्कृतम्,sd:سنڌي,ss:siSwati,tn:Setswana,st:Sesotho,ts:Xitsonga,ve:Tshivenḓa,xh:isiXhosa,wo:Wolof,gn:Avañeʼẽ,bi:Bislama,ch:Chamoru,sm:Gagana Samoa,na:Dorerin Naoero,tg:тоҷикӣ,tk:Türkmençe,tt:татар теле,ba:башҡортса,ce:нохчийн,cv:чӑвашла,sah:сахалыы,iu:ᐃᓄᒃᑎᑐᑦ,fj:Na Vosa Vakaviti,jv:Basa Jawa,ny:Chichewa,nr:isiNdebele,sc:sardu,co:corsu,oc:occitan,pap:Papiamento,kw:kernewek,ku:Kurdî";

  // ─── RUNTIME INDEXES ───
  var _ok = false, _tz2cc, _cc, _l2cc, _lr, _ln;

  function _init() {
    if (_ok) return;
    _tz2cc = Object.create(null);
    _cc    = Object.create(null);
    _l2cc  = Object.create(null);
    _lr    = Object.create(null);
    _ln    = Object.create(null);

    // Parse countries
    for (var es = CP.split("|"), i = 0; i < es.length; i++) {
      var p = es[i].split(","), cc = p[0], langs = p[3] ? p[3].split(".") : [];
      _cc[cc] = { cc:cc, num:+p[1], call:+p[2]||0, langs:langs, primary:langs[0]||null };
      for (var j = 0; j < langs.length; j++) {
        var l = langs[j];
        if (!_l2cc[l]) _l2cc[l] = [];
        _l2cc[l].push({ cc:cc, isPrimary: j===0 });
      }
    }
    // Language rarity
    for (var l in _l2cc) _lr[l] = 1 / _l2cc[l].length;

    // Parse timezones
    for (var ts = TP.split(";"), i = 0; i < ts.length; i++) {
      var x = ts[i].indexOf(">");
      _tz2cc[ts[i].substring(0,x)] = ts[i].substring(x+1).split(".");
    }
    // Parse language names
    for (var ns = LN.split(","), i = 0; i < ns.length; i++) {
      var ci = ns[i].indexOf(":");
      _ln[ns[i].substring(0,ci)] = ns[i].substring(ci+1);
    }
    _ok = true;
  }

  // ─── BCP-47 PARSER ───
  function _bcp(tag) {
    var parts = String(tag||"").replace(/_/g,"-").split("-");
    var lang = parts[0].toLowerCase(), region = null;
    for (var i=1;i<parts.length;i++) {
      if (/^[A-Za-z]{2}$/.test(parts[i])) { region=parts[i].toUpperCase(); break; }
    }
    return { lang: (lang.length>=2 && lang.length<=3)?lang:null, region: region };
  }

  // ─── SCORING ───
  //
  //  Timezone = where you ARE.  Language = who you ARE.
  //
  //  Signal              Base   Max with bonuses
  //  ──────────────────  ─────  ────────────────
  //  navigator-region      40   40 × position-decay (1st lang=full, 2nd=less...)
  //  timezone               –   30 base + 25 uniqueness = 55
  //  cross (nav+tz agree)  10   10
  //  language match          –   20 × rarity × position-decay
  //  primary-lang bonus     5    5
  //  ──────────────────────────────────────────
  //  Max possible:        130
  //
  //  Position decay: factor = 1 / (1 + pos × 0.35)
  //  Position 0 (first lang): ×1.00
  //  Position 1:              ×0.74
  //  Position 2:              ×0.59
  //  Position 3:              ×0.49
  //  This reflects navigator.languages preference ordering.
  //
  var W = { nr:40, tzBase:30, tzUq:25, xb:10, lm:20, pl:5 };
  var DECAY = 0.35; // position decay factor

  function _score(cc, navR, tzCC, tzCount, uLangs) {
    var s=0, rec=_cc[cc]; if(!rec) return 0;
    var hasN=false, hasT=false;

    // Navigator region — weighted by position in languages list
    for (var i=0;i<navR.length;i++) {
      if (navR[i].code===cc) {
        s += W.nr / (1 + navR[i].pos * DECAY);
        hasN=true;
        break;
      }
    }

    // Timezone
    for (var i=0;i<tzCC.length;i++) {
      if(tzCC[i]===cc) {
        s+=W.tzBase;
        if (tzCount > 0) s += W.tzUq * (1 / tzCount);
        hasT=true;
        break;
      }
    }
    if (hasN && hasT) s += W.xb;

    // Language match — weighted by rarity and position
    var cl = rec.langs;
    for (var i=0;i<uLangs.length;i++) {
      for (var j=0;j<cl.length;j++) {
        if (cl[j]===uLangs[i]) {
          var r = _lr[uLangs[i]]||0.01;
          s += W.lm * Math.min(r*3,1) / (1+i*DECAY);
          if (j===0) s += W.pl / (1+i*DECAY);
          i = uLangs.length; // break outer
          break;
        }
      }
    }
    return s;
  }

  // ─── DETECT ───
  function detect(ov) {
    _init();
    ov = ov||{};
    var raw = ov.languages || (typeof navigator!=="undefined" ?
      ((navigator.languages&&navigator.languages.length)?navigator.languages:
       (navigator.language?[navigator.language]:[])) : []);

    var langs=[], regs=[], sL=Object.create(null), sR=Object.create(null);
    for (var i=0;i<raw.length;i++) {
      var p=_bcp(raw[i]);
      if(p.lang&&!sL[p.lang]){langs.push(p.lang);sL[p.lang]=1;}
      // Track region WITH its position in the languages list
      if(p.region&&!sR[p.region]){regs.push({code:p.region,pos:i});sR[p.region]=1;}
    }

    var tz = ov.timezone || (function(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||null;}catch(e){return null;}})();
    var tzCC = (tz&&_tz2cc[tz]) ? _tz2cc[tz] : [];

    // Build candidates
    var cands = Object.create(null);
    for (var i=0;i<regs.length;i++) if(_cc[regs[i].code]) cands[regs[i].code]=1;
    for (var i=0;i<tzCC.length;i++) cands[tzCC[i]]=1;
    // Rare-language candidates only (≤8 countries)
    for (var i=0;i<langs.length;i++) {
      if ((_lr[langs[i]]||0) >= 1/8 && _l2cc[langs[i]]) {
        for (var j=0;j<_l2cc[langs[i]].length;j++) cands[_l2cc[langs[i]][j].cc]=1;
      }
    }

    // Fallback: if no candidates, include countries for ALL user languages
    var hasCands = false;
    for (var c in cands) { hasCands=true; break; }
    if (!hasCands && langs.length) {
      for (var i=0;i<langs.length;i++) {
        if (_l2cc[langs[i]]) {
          for (var j=0;j<_l2cc[langs[i]].length;j++) cands[_l2cc[langs[i]][j].cc]=1;
        }
      }
    }

    var tzCount = tzCC.length;
    var scored = [];
    for (var c in cands) { var s=_score(c,regs,tzCC,tzCount,langs); if(s>0) scored.push({c:c,s:s}); }
    scored.sort(function(a,b){return b.s-a.s;});

    // Adaptive max: only count signal categories that are actually available.
    // If the user has no region subtags, they can never earn nr+xb points.
    // If there's no timezone, they can never earn tzBase+tzUq.
    // Region max accounts for position decay of the best (first) region.
    // This makes confidence = "how well do the available signals agree?"
    var mx = 0;
    if (regs.length > 0)  mx += W.nr / (1 + regs[0].pos * DECAY) + W.xb;  // best region's decayed max
    if (tzCC.length > 0)  mx += W.tzBase + (tzCount > 0 ? W.tzUq / tzCount : 0);
    if (langs.length > 0) mx += W.lm + W.pl;
    if (mx < 1) mx = 1;
    var countries = [];
    for (var i=0;i<scored.length;i++) {
      countries.push({
        code: scored[i].c,
        score: Math.round(scored[i].s*10)/10,
        confidence: Math.round(Math.min(scored[i].s/mx,1)*100)/100
      });
    }
    // ── Smart language reranking ──
    // The order in navigator.languages is often OS-driven, not preference-driven.
    // We re-weight using timezone country correlation and language rarity.
    //
    //   effectiveWeight = positionBase × tzBoost × rarityBoost × osDefaultPenalty
    //
    //   positionBase:    1/(1+pos×0.35)  — original order still matters
    //   tzBoost:         ×2.0 if primary in tz-country, ×1.6 if secondary, else ×1
    //   rarityBoost:     1 + rarity×1.5  — rare = intentional (he→×2.5, en→×1.01)
    //   osDefaultPenalty: ×0.6 if pos=0 AND very common (rarity<0.02)
    //                    catches "en/zh at pos 0 is just OS language"

    // Find the top timezone country for matching
    var tzTopCC = (countries.length && tzCC.length) ? countries[0].code : null;
    var tzTopRec = tzTopCC ? _cc[tzTopCC] : null;

    var langRes = [];
    for (var i=0;i<langs.length;i++) {
      var code = langs[i];
      var rarity = _lr[code] || 0;
      var posBase = 1 / (1 + i * DECAY);

      // Timezone country boost
      var tzBoost = 1;
      if (tzTopRec) {
        var tzLangs = tzTopRec.langs;
        if (tzLangs[0] === code) tzBoost = 2.0;        // primary language of where you live
        else if (tzLangs.indexOf(code) !== -1) tzBoost = 1.6; // secondary there
      }

      // Rarity boost: rare language = you chose it deliberately
      var rarBoost = 1 + rarity * 1.5;

      // OS default penalty: very common language at pos 0 is likely OS, not preference
      // BUT only if it's NOT spoken in the timezone country — if it IS, it's natural.
      var osPenalty = 1;
      if (i === 0 && rarity < 0.02 && tzBoost === 1) osPenalty = 0.6;

      var ew = posBase * tzBoost * rarBoost * osPenalty;

      langRes.push({
        code: code,
        name: _ln[code]||"",
        rarity: Math.round(rarity*1000)/1000,
        countriesCount: _l2cc[code]?_l2cc[code].length:0,
        originalPosition: i,
        weight: Math.round(ew*100)/100
      });
    }

    // Sort by weight descending — this IS the reranked order
    langRes.sort(function(a,b){ return b.weight - a.weight; });

    return {
      languages: langRes, countries: countries, timezone: tz,
      topCountry: countries.length?countries[0].code:null,
      topLanguage: langRes.length?langRes[0].code:null,
      signals: { navigatorRegions:regs.map(function(r){return{code:r.code,position:r.pos};}), timezoneCountries:tzCC, timezoneUniqueness:tzCount<=1?1:Math.round(100/tzCount)/100, detectedLanguages:langs }
    };
  }

  // ─── UTILITIES ───
  function getCountry(code) {
    _init(); var r=_cc[String(code).toUpperCase()]; if(!r) return null;
    return {code:r.cc,numericCode:r.num,callingCode:r.call||null,languages:r.langs.slice(),primaryLanguage:r.primary};
  }
  function getLanguageName(c){_init();return _ln[String(c).toLowerCase()]||"";}
  function getLanguageRarity(c){_init();return _lr[String(c).toLowerCase()]||0;}
  function countriesForLanguage(c){_init();var e=_l2cc[String(c).toLowerCase()];return e?e.map(function(x){return{code:x.cc,isPrimary:x.isPrimary}}):[];}
  function countriesForTimezone(t){_init();return _tz2cc[t]?_tz2cc[t].slice():[];}

  /**
   * Parse an HTTP Accept-Language header into a sorted language array.
   * Input:  "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7,fr;q=0.3"
   * Output: ["he-IL", "he", "en-US", "en", "fr"]
   *
   * @param {string} header - The Accept-Language header value
   * @returns {string[]} Language tags sorted by quality (descending)
   */
  function parseAcceptLanguage(header) {
    if (!header || typeof header !== "string") return [];
    var items = [];
    var parts = header.split(",");
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i].trim();
      if (!seg) continue;
      var qIdx = seg.indexOf(";");
      var tag, q;
      if (qIdx === -1) {
        tag = seg;
        q = 1;
      } else {
        tag = seg.substring(0, qIdx).trim();
        var qMatch = seg.substring(qIdx).match(/q\s*=\s*([0-9.]+)/);
        q = qMatch ? parseFloat(qMatch[1]) : 1;
      }
      if (tag && tag !== "*") items.push({ tag: tag, q: q, pos: i });
    }
    // Sort by quality desc, then by original position asc (stable)
    items.sort(function (a, b) { return b.q - a.q || a.pos - b.pos; });
    var result = [];
    for (var i = 0; i < items.length; i++) result.push(items[i].tag);
    return result;
  }

  /**
   * Server-side convenience: detect locale from an HTTP request object.
   * Works with Express, Koa, raw Node.js, or any object with headers.
   *
   * @param {Object} req - HTTP request (needs req.headers["accept-language"])
   * @param {Object} [extra] - Additional overrides
   * @param {string} [extra.timezone] - Client timezone (e.g. from cookie or query)
   * @returns {DetectResult}
   */
  function fromRequest(req, extra) {
    var header = "";
    if (req && req.headers) {
      // Case-insensitive header lookup (covers Express lowercase, raw Node, and edge runtimes)
      var h = req.headers;
      var val = h["accept-language"] || h["Accept-Language"] || h["ACCEPT-LANGUAGE"];
      if (!val) {
        // Full case-insensitive fallback
        for (var k in h) {
          if (k.toLowerCase() === "accept-language") { val = h[k]; break; }
        }
      }
      // Some frameworks pass arrays for duplicate headers
      header = Array.isArray(val) ? val.join(",") : (val || "");
    }
    var langs = parseAcceptLanguage(header);
    var opts = { languages: langs };
    if (extra && extra.timezone) opts.timezone = extra.timezone;
    return detect(opts);
  }

  return {
    detect:detect, getCountry:getCountry, getLanguageName:getLanguageName,
    getLanguageRarity:getLanguageRarity, countriesForLanguage:countriesForLanguage,
    countriesForTimezone:countriesForTimezone,
    parseAcceptLanguage:parseAcceptLanguage, fromRequest:fromRequest,
    version:"2.2.0"
  };
});
