// Master Authoritative Customer Opening Balances Mapping
// Extracted from original party receivable baseline and recovery dataset
export interface CustomerOpeningRecord {
  code: string;
  title: string;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
}

export const MASTER_CUSTOMER_OPENING_BALANCES: Record<string, CustomerOpeningRecord> = {
  "shamsalkhanrestaurant": {
    "code": "0101040005",
    "title": "Shams al khan restaurant",
    "openingBalance": 100.4,
    "openingBalanceType": "DR"
  },
  "spicypointbfc": {
    "code": "0101040006",
    "title": "Spicy point bfc",
    "openingBalance": 2099.0,
    "openingBalanceType": "DR"
  },
  "alqadrirestaurant": {
    "code": "0101040004",
    "title": "Al qadri restaurant",
    "openingBalance": 173.48,
    "openingBalanceType": "DR"
  },
  "peshawarzalmirestaurantn07": {
    "code": "0101040010",
    "title": "Peshawar zalmi restaurant n07",
    "openingBalance": 1000.0,
    "openingBalanceType": "DR"
  },
  "najmajazanrestkitchen": {
    "code": "0101040015",
    "title": "Najma jazan rest & kitchen",
    "openingBalance": 17.59,
    "openingBalanceType": "DR"
  },
  "dawatrestaurantllc": {
    "code": "0101040019",
    "title": "Dawat restaurant llc",
    "openingBalance": 152.0,
    "openingBalanceType": "DR"
  },
  "seehalsajjahrestaurant": {
    "code": "0101040023",
    "title": "Seeh al sajjah restaurant",
    "openingBalance": 125.11,
    "openingBalanceType": "DR"
  },
  "karachistarresturant": {
    "code": "0101040029",
    "title": "Karachi star resturant",
    "openingBalance": 1316.17,
    "openingBalanceType": "DR"
  },
  "apnagujranwala": {
    "code": "0101040032",
    "title": "Apna gujranwala",
    "openingBalance": 227.0,
    "openingBalanceType": "DR"
  },
  "karachiexpressrestaurant": {
    "code": "0101040033",
    "title": "Karachi express restaurant",
    "openingBalance": 1447.08,
    "openingBalanceType": "DR"
  },
  "hazaradarbar": {
    "code": "0101040034",
    "title": "Hazara darbar",
    "openingBalance": 3600.0,
    "openingBalanceType": "DR"
  },
  "duranibannupulao": {
    "code": "0101040035",
    "title": "Durani bannu pulao",
    "openingBalance": 1450.5,
    "openingBalanceType": "DR"
  },
  "shahisultandarbarresturant": {
    "code": "0101040036",
    "title": "Shahi sultan darbar resturant",
    "openingBalance": 39064.91,
    "openingBalanceType": "DR"
  },
  "daralnoor": {
    "code": "0101040038",
    "title": "Dar al noor",
    "openingBalance": 8531.33,
    "openingBalanceType": "DR"
  },
  "nooralseef": {
    "code": "0101040039",
    "title": "Noor al seef",
    "openingBalance": 1297.39,
    "openingBalanceType": "DR"
  },
  "khayalalshay": {
    "code": "0101040040",
    "title": "Khayal al shay",
    "openingBalance": 509.08,
    "openingBalanceType": "DR"
  },
  "baitaljawahir": {
    "code": "0101040041",
    "title": "Bait al jawahir",
    "openingBalance": 429.75,
    "openingBalanceType": "DR"
  },
  "muhammadzalanirestutran": {
    "code": "0101040042",
    "title": "Muhammad zalani restutran",
    "openingBalance": 4.3,
    "openingBalanceType": "DR"
  },
  "daralaman": {
    "code": "0101040043",
    "title": "Dar al aman",
    "openingBalance": 1704.05,
    "openingBalanceType": "DR"
  },
  "tareeqwadialkhair": {
    "code": "0101040045",
    "title": "Tareeq wadi al khair",
    "openingBalance": 285.76,
    "openingBalanceType": "DR"
  },
  "saifalmadina": {
    "code": "0101040047",
    "title": "Saif al madina",
    "openingBalance": 3483.18,
    "openingBalanceType": "DR"
  },
  "ardalwaharestaurant": {
    "code": "0101040048",
    "title": "Ard al waha restaurant",
    "openingBalance": 1900.6,
    "openingBalanceType": "DR"
  },
  "daralmahbarestaurant": {
    "code": "0101040050",
    "title": "Dar al mahba restaurant",
    "openingBalance": 11598.06,
    "openingBalanceType": "DR"
  },
  "qasaralreyanrestaurant": {
    "code": "0101040051",
    "title": "Qasar al reyan restaurant",
    "openingBalance": 8.57,
    "openingBalanceType": "DR"
  },
  "peshwardhaikka": {
    "code": "0101040052",
    "title": "Peshwar dhaikka",
    "openingBalance": 269.0,
    "openingBalanceType": "DR"
  },
  "alhujrarestaurant": {
    "code": "0101040054",
    "title": "Al hujra restaurant",
    "openingBalance": 879.21,
    "openingBalanceType": "DR"
  },
  "altaiefalmadina": {
    "code": "0101040055",
    "title": "Al taief al madina",
    "openingBalance": 451.46,
    "openingBalanceType": "DR"
  },
  "shahjahancafetetria": {
    "code": "0101040056",
    "title": "Shah jahan cafetetria",
    "openingBalance": 1515.16,
    "openingBalanceType": "DR"
  },
  "localcustomer": {
    "code": "0101040057",
    "title": "Local customer",
    "openingBalance": 855.73,
    "openingBalanceType": "CR"
  },
  "fanalnadir": {
    "code": "0101040059",
    "title": "Fan al nadir",
    "openingBalance": 733.86,
    "openingBalanceType": "DR"
  },
  "punjabijunction": {
    "code": "0101040060",
    "title": "Punjabi junction",
    "openingBalance": 1640.0,
    "openingBalanceType": "DR"
  },
  "babagesialkot": {
    "code": "0101040065",
    "title": "Baba ge sialkot",
    "openingBalance": 1186.99,
    "openingBalanceType": "DR"
  },
  "baitalsajjaa": {
    "code": "0101040067",
    "title": "Bait al sajjaa",
    "openingBalance": 2371.04,
    "openingBalanceType": "DR"
  },
  "reemalfalaja": {
    "code": "0101040069",
    "title": "Reem al falaja",
    "openingBalance": 6592.36,
    "openingBalanceType": "DR"
  },
  "nahralsajja": {
    "code": "0101040073",
    "title": "Nahr al sajja",
    "openingBalance": 4097.55,
    "openingBalanceType": "DR"
  },
  "newaliresturant": {
    "code": "0101040074",
    "title": "New ali resturant",
    "openingBalance": 19.02,
    "openingBalanceType": "DR"
  },
  "akalatbilady": {
    "code": "0101040076",
    "title": "Akalat bilady",
    "openingBalance": 1047.45,
    "openingBalanceType": "DR"
  },
  "jabalalmadina": {
    "code": "0101040077",
    "title": "Jabal al madina",
    "openingBalance": 94.98,
    "openingBalanceType": "DR"
  },
  "wadialkhair": {
    "code": "0101040078",
    "title": "Wadi al khair",
    "openingBalance": 71.46,
    "openingBalanceType": "DR"
  },
  "almusafirresturant": {
    "code": "0101040079",
    "title": "Al musafir resturant",
    "openingBalance": 886.11,
    "openingBalanceType": "DR"
  },
  "qasaralsajja": {
    "code": "0101040080",
    "title": "Qasar al sajja",
    "openingBalance": 2596.63,
    "openingBalanceType": "DR"
  },
  "royaltiger": {
    "code": "0101040081",
    "title": "Royal tiger",
    "openingBalance": 3.2,
    "openingBalanceType": "DR"
  },
  "qasaralkaram": {
    "code": "0101040084",
    "title": "Qasar al karam",
    "openingBalance": 2663.98,
    "openingBalanceType": "DR"
  },
  "alkhidmahrestaunt": {
    "code": "0101040086",
    "title": "Al khidmah restaunt",
    "openingBalance": 2189.69,
    "openingBalanceType": "DR"
  },
  "reyahalmadinarestuant": {
    "code": "0101040088",
    "title": "Reyah al madina restuant",
    "openingBalance": 20.98,
    "openingBalanceType": "DR"
  },
  "mawalrestuant": {
    "code": "0101040091",
    "title": "Mawal restuant",
    "openingBalance": 100.59,
    "openingBalanceType": "DR"
  },
  "tastybaanhao": {
    "code": "0101040097",
    "title": "Tasty baan hao",
    "openingBalance": 199.0,
    "openingBalanceType": "DR"
  },
  "nooralwaseel": {
    "code": "0101040098",
    "title": "Noor al waseel",
    "openingBalance": 312.8,
    "openingBalanceType": "DR"
  },
  "najoomalsama": {
    "code": "0101040101",
    "title": "Najoom al sama",
    "openingBalance": 204.7,
    "openingBalanceType": "DR"
  },
  "pakistanidarbar": {
    "code": "0101040103",
    "title": "Pakistani darbar",
    "openingBalance": 18.06,
    "openingBalanceType": "CR"
  },
  "kpk": {
    "code": "0101040110",
    "title": "Kpk",
    "openingBalance": 232.98,
    "openingBalanceType": "DR"
  },
  "ruknalshamil": {
    "code": "0101040111",
    "title": "Rukn al shamil",
    "openingBalance": 1202.05,
    "openingBalanceType": "DR"
  },
  "daralmaha": {
    "code": "0101040115",
    "title": "Dar al maha",
    "openingBalance": 354.2,
    "openingBalanceType": "DR"
  },
  "alreadcarpentry": {
    "code": "0101040125",
    "title": "Al read carpentry",
    "openingBalance": 748.5,
    "openingBalanceType": "DR"
  },
  "abdullahafghanresturant": {
    "code": "0101040128",
    "title": "Abdullah afghan resturant",
    "openingBalance": 7659.0,
    "openingBalanceType": "DR"
  },
  "bestpointsupermarket": {
    "code": "0101040129",
    "title": "Best point super market",
    "openingBalance": 512.35,
    "openingBalanceType": "DR"
  },
  "abcresturant": {
    "code": "0101040135",
    "title": "A.b.c resturant",
    "openingBalance": 194.0,
    "openingBalanceType": "DR"
  },
  "ptiresturant": {
    "code": "0101040136",
    "title": "Pti resturant",
    "openingBalance": 138.0,
    "openingBalanceType": "DR"
  },
  "nasreenakhtar": {
    "code": "0101040146",
    "title": "Nasreen akhtar",
    "openingBalance": 2090.0,
    "openingBalanceType": "DR"
  },
  "bustanalkhair": {
    "code": "0101040150",
    "title": "Bustan al khair",
    "openingBalance": 1914.0,
    "openingBalanceType": "DR"
  },
  "bhaiabid": {
    "code": "0101040151",
    "title": "Bhai abid",
    "openingBalance": 9241.27,
    "openingBalanceType": "DR"
  },
  "sherazrahmanfoodstufftradimgllc": {
    "code": "0101040152",
    "title": "Sheraz & rahman foodstuff tradimg l.l.c",
    "openingBalance": 5985.0,
    "openingBalanceType": "DR"
  },
  "sahilalmadina": {
    "code": "0101040154",
    "title": "Sahil al madina",
    "openingBalance": 303.43,
    "openingBalanceType": "DR"
  },
  "pakrose": {
    "code": "0101040158",
    "title": "Pak rose",
    "openingBalance": 1000.0,
    "openingBalanceType": "DR"
  },
  "shahidhussainkitchen": {
    "code": "0101040159",
    "title": "Shahid hussain kitchen",
    "openingBalance": 899.0,
    "openingBalanceType": "DR"
  },
  "whitehillresturant": {
    "code": "0101040164",
    "title": "White hill resturant",
    "openingBalance": 407.12,
    "openingBalanceType": "DR"
  },
  "goldenfuture": {
    "code": "0101040169",
    "title": "Golden future",
    "openingBalance": 260.15,
    "openingBalanceType": "DR"
  },
  "babulnoor": {
    "code": "0101040170",
    "title": "Babul noor",
    "openingBalance": 524.51,
    "openingBalanceType": "DR"
  },
  "nooralam": {
    "code": "0101040173",
    "title": "Noor alam",
    "openingBalance": 466.25,
    "openingBalanceType": "DR"
  },
  "alamincarpentry": {
    "code": "0101040174",
    "title": "Al amin carpentry",
    "openingBalance": 0.66,
    "openingBalanceType": "DR"
  },
  "alfarqad": {
    "code": "0101040176",
    "title": "Al farqad",
    "openingBalance": 2886.15,
    "openingBalanceType": "DR"
  },
  "sunduqalnazoom": {
    "code": "0101040178",
    "title": "Sunduq al nazoom",
    "openingBalance": 105.0,
    "openingBalanceType": "DR"
  },
  "redline": {
    "code": "0101040180",
    "title": "Red line",
    "openingBalance": 1622.87,
    "openingBalanceType": "DR"
  },
  "babalbarashirestaurent": {
    "code": "0101040181",
    "title": "Bab al barashi restaurent",
    "openingBalance": 1694.21,
    "openingBalanceType": "DR"
  },
  "orinarestaurant": {
    "code": "0101040184",
    "title": "Orina restaurant",
    "openingBalance": 31.07,
    "openingBalanceType": "DR"
  },
  "ajwahalsajjah": {
    "code": "0101040186",
    "title": "Ajwah al sajjah",
    "openingBalance": 7349.0,
    "openingBalanceType": "DR"
  },
  "altabaqalsakhinrestaurant": {
    "code": "0101040187",
    "title": "Al tabaq al sakhin restaurant",
    "openingBalance": 27.76,
    "openingBalanceType": "DR"
  },
  "muzamilbhai": {
    "code": "0101040188",
    "title": "Muzamil bhai",
    "openingBalance": 242.55,
    "openingBalanceType": "DR"
  },
  "muneerbhi": {
    "code": "0101040191",
    "title": "Muneer bhi",
    "openingBalance": 11877.53,
    "openingBalanceType": "DR"
  },
  "sabarbhai": {
    "code": "0101040192",
    "title": "Sabar bhai",
    "openingBalance": 2017.23,
    "openingBalanceType": "DR"
  },
  "shahidbhai": {
    "code": "0101040193",
    "title": "Shahid bhai",
    "openingBalance": 42838.66,
    "openingBalanceType": "DR"
  },
  "mumarcarpentry": {
    "code": "0101040195",
    "title": "M.umar carpentry",
    "openingBalance": 30.0,
    "openingBalanceType": "DR"
  },
  "truckadda": {
    "code": "0101040196",
    "title": "Truck adda",
    "openingBalance": 5.65,
    "openingBalanceType": "DR"
  },
  "amirshahzadrestaurent": {
    "code": "0101040197",
    "title": "Amir shahzad restaurent",
    "openingBalance": 1474.99,
    "openingBalanceType": "DR"
  },
  "abdulraheemcarpantry": {
    "code": "0101040198",
    "title": "Abdul raheem carpantry",
    "openingBalance": 1678.34,
    "openingBalanceType": "DR"
  },
  "bilaldib": {
    "code": "0101040199",
    "title": "Bilal dib",
    "openingBalance": 3.42,
    "openingBalanceType": "DR"
  },
  "banubeffpulaosajjja": {
    "code": "0101040208",
    "title": "Banu beff pulao sajjja",
    "openingBalance": 441.91,
    "openingBalanceType": "DR"
  },
  "babalbedayahcafeteriya": {
    "code": "0101040210",
    "title": "Bab al bedayah cafeteriya",
    "openingBalance": 80.66,
    "openingBalanceType": "DR"
  },
  "habibullahcarpentary": {
    "code": "0101040211",
    "title": "Habibullah carpentary",
    "openingBalance": 95.0,
    "openingBalanceType": "DR"
  },
  "awadalsukarcafeteria": {
    "code": "0101040218",
    "title": "Awad al sukar cafeteria",
    "openingBalance": 712.0,
    "openingBalanceType": "DR"
  },
  "janobalseyoncafeteria": {
    "code": "0101040219",
    "title": "Janob al seyon cafeteria",
    "openingBalance": 0.4,
    "openingBalanceType": "DR"
  },
  "muhammadfarukh": {
    "code": "0101040221",
    "title": "Muhammad farukh",
    "openingBalance": 7.48,
    "openingBalanceType": "DR"
  },
  "abaqalmadinacafeteria": {
    "code": "0101040223",
    "title": "Abaq al madina cafeteria",
    "openingBalance": 304.06,
    "openingBalanceType": "DR"
  },
  "ruknalwafa": {
    "code": "0101040224",
    "title": "Rukn al wafa",
    "openingBalance": 232.58,
    "openingBalanceType": "DR"
  },
  "atifbhai": {
    "code": "0101040230",
    "title": "Atif bhai",
    "openingBalance": 0.5,
    "openingBalanceType": "CR"
  },
  "naharalchay": {
    "code": "0101040231",
    "title": "Nahar al chay",
    "openingBalance": 2351.48,
    "openingBalanceType": "DR"
  },
  "adwahalsajja": {
    "code": "0101040234",
    "title": "Adwah al sajja",
    "openingBalance": 401.6,
    "openingBalanceType": "DR"
  },
  "akbaralikitchen": {
    "code": "0101040235",
    "title": "Akbar ali kitchen",
    "openingBalance": 906.72,
    "openingBalanceType": "DR"
  },
  "ruknaltathawk": {
    "code": "0101040238",
    "title": "Rukn al tathawk",
    "openingBalance": 6287.31,
    "openingBalanceType": "DR"
  },
  "mridulbhai": {
    "code": "0101040242",
    "title": "Mridul bhai",
    "openingBalance": 2594.17,
    "openingBalanceType": "DR"
  },
  "wardaalrehan": {
    "code": "0101040243",
    "title": "Warda al rehan",
    "openingBalance": 105.0,
    "openingBalanceType": "DR"
  },
  "shayalfakhir": {
    "code": "0101040246",
    "title": "Shay al fakhir",
    "openingBalance": 791.01,
    "openingBalanceType": "DR"
  },
  "tareeqalsada": {
    "code": "0101040249",
    "title": "Tareeq al sada",
    "openingBalance": 462.62,
    "openingBalanceType": "DR"
  },
  "waraqaalkhareef": {
    "code": "0101040252",
    "title": "Waraqa al khareef",
    "openingBalance": 573.94,
    "openingBalanceType": "DR"
  },
  "perfectoasiscateringservicesllc": {
    "code": "0101040255",
    "title": "Perfect oasis catering services l.l.c",
    "openingBalance": 2.22,
    "openingBalanceType": "DR"
  },
  "yousafcafateria": {
    "code": "0101040258",
    "title": "Yousaf cafateria",
    "openingBalance": 3707.49,
    "openingBalanceType": "DR"
  },
  "mazaqaljadeedcafeteria": {
    "code": "0101040260",
    "title": "Mazaq al jadeed cafeteria",
    "openingBalance": 196.54,
    "openingBalanceType": "DR"
  },
  "jamaldhaka": {
    "code": "0101040262",
    "title": "Jamal dhaka",
    "openingBalance": 4651.74,
    "openingBalanceType": "DR"
  },
  "janobalsayoh": {
    "code": "0101040263",
    "title": "Janob al sayoh",
    "openingBalance": 403.44,
    "openingBalanceType": "DR"
  },
  "alkhatalawalcafeteria": {
    "code": "0101040265",
    "title": "Al khat al awal cafeteria",
    "openingBalance": 1247.76,
    "openingBalanceType": "DR"
  },
  "sadaambhai": {
    "code": "0101040266",
    "title": "Sadaam bhai",
    "openingBalance": 3469.36,
    "openingBalanceType": "DR"
  },
  "revibexventuresgeneraltradingllc": {
    "code": "0101040268",
    "title": "Revibex ventures general trading l.l.c",
    "openingBalance": 1055.45,
    "openingBalanceType": "DR"
  },
  "mansoordip": {
    "code": "0101040269",
    "title": "Mansoor dip",
    "openingBalance": 216.0,
    "openingBalanceType": "DR"
  },
  "anjumabbas": {
    "code": "0101040270",
    "title": "Anjum abbas",
    "openingBalance": 50.0,
    "openingBalanceType": "DR"
  },
  "alasimcafeteria": {
    "code": "0101040274",
    "title": "Al asim cafeteria",
    "openingBalance": 473.2,
    "openingBalanceType": "DR"
  },
  "abdulshokoorrazmohammad": {
    "code": "0101040275",
    "title": "Abdul shokoor raz mohammad",
    "openingBalance": 419.31,
    "openingBalanceType": "DR"
  },
  "rukanalreyan": {
    "code": "0101040279",
    "title": "Rukan al reyan",
    "openingBalance": 1630.72,
    "openingBalanceType": "DR"
  },
  "najoomalbataya": {
    "code": "0101040280",
    "title": "Najoom al bataya",
    "openingBalance": 326.55,
    "openingBalanceType": "DR"
  },
  "zahraalbahar": {
    "code": "0101040281",
    "title": "Zahra al bahar",
    "openingBalance": 475.27,
    "openingBalanceType": "DR"
  },
  "alfarinacafeteria": {
    "code": "0101040282",
    "title": "Al farina cafeteria",
    "openingBalance": 0.1,
    "openingBalanceType": "DR"
  },
  "tastyeatscateringservicesllc": {
    "code": "0101040285",
    "title": "Tasty eats catering services llc",
    "openingBalance": 6324.81,
    "openingBalanceType": "DR"
  },
  "rukanalzawaya": {
    "code": "0101040286",
    "title": "Rukan al zawaya",
    "openingBalance": 661.97,
    "openingBalanceType": "DR"
  },
  "mrafiqcarpentry": {
    "code": "0101040288",
    "title": "M. rafiq carpentry",
    "openingBalance": 902.27,
    "openingBalanceType": "DR"
  },
  "abdurahmancafeteria": {
    "code": "0101040289",
    "title": "Abdurahman cafeteria",
    "openingBalance": 138.07,
    "openingBalanceType": "DR"
  },
  "wahatosayamcafeteria": {
    "code": "0101040292",
    "title": "Waha to sayam cafeteria",
    "openingBalance": 0.8,
    "openingBalanceType": "DR"
  },
  "daralqaram": {
    "code": "0101040293",
    "title": "Dar al qaram",
    "openingBalance": 756.52,
    "openingBalanceType": "DR"
  },
  "1to10restaurant": {
    "code": "0101040296",
    "title": "1 to 10 restaurant",
    "openingBalance": 229.42,
    "openingBalanceType": "DR"
  },
  "alfareenacafeteria": {
    "code": "0101040298",
    "title": "Al fareena cafeteria",
    "openingBalance": 15.88,
    "openingBalanceType": "DR"
  },
  "rightwayrestaurant": {
    "code": "0101040299",
    "title": "Right way restaurant",
    "openingBalance": 981.34,
    "openingBalanceType": "DR"
  },
  "fajralyaqouqicecreamshop": {
    "code": "0101040300",
    "title": "Fajr al yaqouq ice cream shop",
    "openingBalance": 1.45,
    "openingBalanceType": "DR"
  },
  "bsfoodstufftradingllc": {
    "code": "0101040302",
    "title": "B s foodstuff trading llc",
    "openingBalance": 2712.7,
    "openingBalanceType": "DR"
  },
  "farisalaseel": {
    "code": "0101040303",
    "title": "Faris al aseel",
    "openingBalance": 7496.7,
    "openingBalanceType": "DR"
  },
  "sooralsajjarestaurent": {
    "code": "0101040304",
    "title": "Soor al sajja restaurent",
    "openingBalance": 411.6,
    "openingBalanceType": "DR"
  },
  "manzilalrayan": {
    "code": "0101040307",
    "title": "Manzil al rayan",
    "openingBalance": 1659.63,
    "openingBalanceType": "DR"
  },
  "aroosalsahel": {
    "code": "0101040309",
    "title": "Aroos al sahel",
    "openingBalance": 78.75,
    "openingBalanceType": "DR"
  },
  "motoheedcafteria": {
    "code": "0101040311",
    "title": "Mo-toheed cafteria",
    "openingBalance": 684.79,
    "openingBalanceType": "DR"
  },
  "sardarahmed": {
    "code": "0101040312",
    "title": "Sardar ahmed",
    "openingBalance": 118.8,
    "openingBalanceType": "DR"
  },
  "daralqasarmandimadhbirestllc": {
    "code": "0101040313",
    "title": "Dar alqasar mandi & madhbi rest l.l.c",
    "openingBalance": 65.0,
    "openingBalanceType": "DR"
  },
  "jenansupermarket": {
    "code": "0101040316",
    "title": "Jenan super market",
    "openingBalance": 615.22,
    "openingBalanceType": "CR"
  },
  "mussakalim": {
    "code": "0101040317",
    "title": "Mussa kalim",
    "openingBalance": 100.0,
    "openingBalanceType": "DR"
  },
  "kabulbakery": {
    "code": "0101040323",
    "title": "Kabul bakery",
    "openingBalance": 1.25,
    "openingBalanceType": "DR"
  },
  "shujaatanwar": {
    "code": "0101040326",
    "title": "Shujaat anwar",
    "openingBalance": 0.19,
    "openingBalanceType": "DR"
  },
  "essasupermarket": {
    "code": "0101040328",
    "title": "Essa super market",
    "openingBalance": 594.3,
    "openingBalanceType": "DR"
  },
  "shahiqillarestaurantllc": {
    "code": "0101040329",
    "title": "Shahi qilla restaurant l.l.c",
    "openingBalance": 3761.63,
    "openingBalanceType": "DR"
  },
  "jameelbakery": {
    "code": "0101040330",
    "title": "Jameel bakery",
    "openingBalance": 389.57,
    "openingBalanceType": "DR"
  },
  "saleemfoodservice": {
    "code": "0101040331",
    "title": "Saleem food service",
    "openingBalance": 252.45,
    "openingBalanceType": "DR"
  },
  "gorkhakitchen": {
    "code": "0101040332",
    "title": "Gorkha kitchen",
    "openingBalance": 1656.46,
    "openingBalanceType": "DR"
  },
  "sharooqalfajar": {
    "code": "0101040334",
    "title": "Sharooq al fajar",
    "openingBalance": 2882.37,
    "openingBalanceType": "DR"
  },
  "qasaralshameel": {
    "code": "0101040336",
    "title": "Qasar al shameel",
    "openingBalance": 465.15,
    "openingBalanceType": "DR"
  },
  "reyahalrahmania": {
    "code": "0101040337",
    "title": "Reyah al rahmania",
    "openingBalance": 139.94,
    "openingBalanceType": "DR"
  },
  "marhabacafeteria": {
    "code": "0101040339",
    "title": "Marhaba cafeteria",
    "openingBalance": 2.79,
    "openingBalanceType": "DR"
  },
  "noormohammadrestaurant": {
    "code": "0101040342",
    "title": "Noor mohammad restaurant",
    "openingBalance": 0.01,
    "openingBalanceType": "DR"
  }
};
