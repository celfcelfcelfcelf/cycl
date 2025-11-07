// Auto-generated CSV loader for riders
// This module contains the provided CSV and a small parser that handles
// quoted fields with newlines. It exports a `riders` array with the
// fields our app expects (NAVN, FLAD, BJERG, SPRINT, MENTALITET, FLAD1..15, BJERG1..15).

const csvText = `NAVN,FLAD,BJERG,BJERG 2,BJERG 3,BJERG 6,BJERG 5+,ENKELTSTART,BROSTEN,BROSTEN_MELLEMREGNING,SPRINT,PUNCHEUR,PUNCHEUR_TOTAL,PUNCHFAKTOR,FLADSPREDNING,BJERGSPREDNING,MENTALITET, RESULTATER,FLAD1,FLAD2,FLAD3,FLAD4,FLAD5,FLAD6,FLAD7,FLAD8,FLAD9,FLAD10,FLAD11,FLAD12,FLAD13,FLAD14,FLAD15,BJERG1,BJERG2,BJERG3,BJERG4,BJERG5,BJERG6,BJERG7,BJERG8,BJERG9,BJERG10,BJERG11,BJERG12,BJERG13,BJERG14,BJERG15
Abdoujabarov,69,58,12,17,31,2,48,+2,0,10,1,59,4,1.5,1.4,2,"9x
stage Tour de France  ('96, '95, '94, '93, '91)
7x
stage Vuelta a Espa–a  ('93, '92)
3x
Points GC Tour de France  ('94, '93, '91)",7,7,6,6,5,5,5,4,4,4,4,4,3,3,2,6,6,5,5,5,4,4,4,4,3,3,3,2,2,2

Sune,49,39,9,13,31,0,48,+2,0,-3,1,59,4,1.5,1.4,2,"9x
stage Tour de France  ('96, '95, '94, '93, '91)
7x
stage Vuelta a Espa–a  ('93, '92)
3x
Points GC Tour de France  ('94, '93, '91)",5,4,4,4,3,3,3,3,3,3,3,3,2,2,2,4,3,3,3,3,3,2,2,2,2,2,2,2,2,2

Alexander Kristoff,72,62,13,18,33,3,47,+7,6,9,8,70,6,1.7,1.4,4,"4x
Rund um den Finanzplatz Eschborn-Frankfurt  ('18, '17, '16, '14)

Milano-Sanremo  ('14)

Ronde van Vlaanderen / Tour des Flandres ME  ('15)",7,7,7,6,6,6,5,5,4,4,4,3,3,3,2,7,6,5,5,5,5,4,4,4,4,3,3,3,2,2
Allan Johansen,67,60,12,17,32,3,42,+3,1,3,1,61,4,1.5,1.5,3," 
Paris-Bourges  ('02)

Grote Prijs Jef Scherens - Leuven  ('04)

BKI Kaffe GP - GP Aarhus  ('99)",7,6,6,6,5,5,5,5,4,4,4,3,3,2,2,6,6,6,5,5,5,4,4,4,3,3,3,2,2,2
Bauke Mollema,71,76,16,23,40,6,51,-5,-7,2,0,76,5,1.7,1.7,4,"Il Lombardia  ('19)

Clasica Ciclista San Sebastian  ('16)
2x
stage Tour de France  ('21, '17)",7,7,7,6,6,6,5,5,4,4,3,3,3,3,2,8,8,7,6,6,5,5,5,5,4,4,4,3,3,3
Bjarne Riis,75,78,16,23,41,7,53,-7,-9,3,-2,76,4,1.5,1.7,4,"GC Tour de France  ('96)

Amstel Gold Race  ('97)

3rd
GC Tour de France  ('95)",8,7,7,6,6,5,5,5,5,5,4,4,3,3,3,8,8,7,6,6,6,6,5,5,4,4,4,3,3,3
Bo Hamburger,66,73,15,22,38,6,47,-1,-2,2,0,73,7,1.7,1.6,5,"La Fl�che Wallonne  ('98)

stage Tour de France  ('94)
2nd
World Championships - Road Race  ('97)",7,7,6,6,6,5,4,4,4,4,3,3,3,2,2,8,7,7,6,5,5,5,5,4,4,4,4,3,3,3
Bobby Julich,74,75,14,19,39,6,55,-4,-6,3,-6,69,5,1.5,1.3,3,"GC Paris - Nice  ('05)

2x
GC CritŽrium International  ('05, '98)
3rd
GC Tour de France  ('98)",7,7,7,6,6,6,5,5,5,4,4,4,3,3,3,7,7,6,6,6,6,5,5,5,4,4,4,4,3,3
Brian Holm,74,64,12,18,34,3,47,+0,-2,2,-1,63,3,1.3,1.4,2,"Paris-Bruxelles  ('91)

Circuit des Fronti�res  ('86)

Paris-Camembert  ('91)",7,7,6,6,6,6,5,5,4,4,4,4,4,3,3,6,6,6,6,5,5,5,4,4,4,3,3,3,2,2
Chris Anker,67,69,14,19,36,5,45,-2,-3,1,-1,68,3,1.5,1.4,3,"Japan Cup Cycle Road Race  ('09)

stage Giro d'Italia  ('10)

14th
GC Tour de France  ('12)",7,6,6,6,6,5,5,4,4,4,3,3,3,3,2,7,7,6,6,5,5,5,4,4,4,4,3,3,3,3
Christopher Juul-Jensen,71,60,13,18,32,3,49,-1,-2,0,3,63,4,1.4,1.4,2,"GC Post Danmark Rundt - Tour of Denmark  ('15)

stage Tour de Suisse  ('18)

2nd
Japan Cup Cycle Road Race  ('16)",7,7,6,6,6,5,5,5,4,4,4,4,3,3,3,6,6,6,5,5,4,4,4,4,3,3,3,3,2,2
Claus Michael Møller,70,71,13,18,37,5,50,-2,-4,0,-5,66,5,1.4,1.4,5,"stage Vuelta a Espa–a  ('01)


GC Volta a Portugal  ('02)
8th
GC Vuelta a Espa–a  ('01)",7,7,6,6,5,5,5,5,4,4,4,4,3,3,2,7,6,6,6,6,6,5,5,4,4,4,4,3,3,2
Dag Otto Lauritsen,70,66,14,19,35,4,49,+2,0,2,1,67,8,1.7,1.5,5,"stage Tour de France  ('87)
3rd
Ronde van Vlaanderen / Tour des Flandres  ('89)

Rund um den Henninger Turm  ('87)",7,7,7,6,6,5,5,5,4,4,3,3,3,3,2,7,7,6,5,5,5,4,4,4,4,4,3,3,3,2
Edvald Boasson Hagen,73,67,14,20,35,4,51,+4,2,7,6,73,8,1.8,1.6,6,"2x
GC Eneco Tour  ('11, '09)
3x
stage Tour de France  ('17, '11)

GP Ouest France - Plouay  ('12)",8,7,7,6,6,6,5,5,5,4,3,3,3,3,2,7,7,6,6,5,5,5,4,4,4,4,3,3,2,2
Eros Poli,69,58,12,17,31,2,40,0,-2,1,0,58,2,1.2,1.4,3,"stage Tour de France  ('94)
3rd
stage Vuelta a Espa–a  ('95)
42nd
Paris - Roubaix  ('98)",7,6,6,6,5,5,5,4,4,4,4,4,3,3,3,6,6,5,5,5,4,4,4,4,3,3,3,2,2,2
Frank Høj,72,61,13,18,32,3,47,+2,0,5,4,65,7,1.7,1.4,5,"2x
Grand Prix S.A.T.S.  ('04, '03)

GC Circuit Franco-Belge  ('98)

Veenendaal - Veenendaal  ('98)",7,7,7,6,6,6,5,5,4,4,4,3,3,3,2,7,6,5,5,5,5,4,4,4,3,3,3,3,2,2
Fredrik Kessiakoff,70,66,13,18,35,4,53,-1,-3,1,-1,65,6,1.6,1.5,4,"GC Int. Osterreich-Rundfahrt-Tour of Austria  ('11)

5th
World Championships - ITT  ('12)

2nd
KOM Tour de France  ('12)",7,7,7,6,6,5,5,5,4,4,4,3,3,3,2,7,6,6,6,5,5,5,4,4,4,3,3,3,3,2
Fåglum,76,77,15,20,40,6,53,-6,-8,0,-6,71,1,1.3,1.5,3,"GC Giro d'Italia  ('71)

GC Tour de Romandie  ('70)

3rd
GC Tour de France  ('70)",7,7,6,6,6,6,6,5,5,5,4,4,4,3,3,7,7,7,7,6,6,5,5,5,4,4,4,4,3,3
Gianni Bugno,74,79,17,25,41,7,53,-1,-2,6,-1,78,8,1.8,1.7,5,"2x
World Championships - Road Race  ('92, '91)
GC Giro d'Italia  ('90)
Ronde van Vlaanderen / Tour des Flandres  ('94)",8,7,7,6,6,6,5,5,5,4,4,3,3,3,2,9,8,7,6,6,5,5,5,5,5,4,4,4,3,3
Gustav Erik Larsson,78,70,13,18,37,5,56,-5,-7,0,-5,65,3,1.3,1.5,1,"GC Tour Du Limousin  ('10)

stage Giro d'Italia  ('10)
2nd
Olympic Games - ITT  ('08)",7,7,7,6,6,6,6,5,5,5,4,4,4,4,3,7,6,6,6,6,6,5,5,4,4,4,3,3,3,2
Jacob Fuglsang,72,74,16,23,39,6,50,-2,-4,0,5,79,5,1.6,1.8,4,"2x
GC CritŽrium du DauphinŽ  ('19, '17)

Li�ge-Bastogne-Li�ge  ('19)

Il Lombardia  ('20)",7,7,7,6,6,6,5,5,4,4,4,3,3,3,3,8,8,7,6,5,5,5,5,5,4,4,4,3,3,2
Jakob Piil,65,63,13,19,33,3,43,+0,-2,3,6,69,7,1.7,1.6,6,"Paris - Tours  ('02)

stage Tour de France  ('03)

GC Post Danmark Rundt  ('02)",7,7,6,6,5,5,5,4,4,4,3,3,2,2,2,7,6,6,5,5,5,5,4,4,4,4,2,2,2,2
Jeroen Blijlevens,64,58,12,17,31,2,40,+4,2,9,0,58,3,1.4,1.4,1,"4x
stage Tour de France  ('98, '97, '96, '95)
5x
stage Vuelta a Espa–a  ('99, '98, '96, '95)
2x
stage Giro d'Italia  ('99)",6,6,6,6,5,5,5,4,4,4,3,3,3,2,2,6,6,5,5,5,4,4,4,4,3,3,3,2,2,2
Jesper Skibby,72,70,14,19,37,5,51,+3,1,3,-1,69,8,1.9,1.5,6,"3x
stage Vuelta a Espa–a  ('95, '91)

stage Tour de France  ('93)

GC Ronde van Nederland  ('94)",8,7,7,6,6,6,6,5,4,4,4,3,3,2,2,7,7,6,6,6,5,5,5,4,4,4,3,3,3,2
Jesper Worre,69,68,13,19,36,4,49,-1,-3,3,-2,66,7,1.5,1.5,4,"stage Vuelta a Espa–a  ('90)

GC PostNord Danmark Rundt - Tour of Denmark  ('86)

GC Tour of Sweden  ('88)",7,7,6,6,6,5,5,4,4,4,4,3,3,3,2,7,6,6,6,6,5,5,5,4,4,3,3,3,3,2
Johnny Weltz,63,65,13,18,34,3,40,+3,1,4,-1,64,4,1.5,1.3,2,"stage Tour de France  ('88)
stage Vuelta a Espa–a  ('88)
7th World Championships - Road Race  ('90)",6,6,6,6,5,5,5,4,4,3,3,3,3,2,2,7,6,5,5,5,5,5,5,4,4,3,3,3,3,2
Jonas Vingegaard,71,77,14,21,40,6,52,-4,-6,1,-5,72,4,1.5,1.5,4,"GC Tour de France  ('22)

2nd
GC Tour de France  ('21)

KOM Tour de France  ('22)",7,7,7,6,6,5,5,5,4,4,4,3,3,3,3,7,7,7,7,6,6,5,5,5,5,4,4,3,3,3
Jussi Veikkanen,65,64,12,18,34,3,44,+2,0,5,-3,61,5,1.6,1.5,3,"stage Deutschland Tour  ('08)
7x
National Championships Finland - Road Race  ('14, '13, '10, '08, '06, '05, '03)
2nd
GC Tour MŽditerranŽen Cycliste Professionnel  ('09)",7,6,6,6,6,5,5,4,4,4,3,3,3,2,2,6,6,6,6,5,5,5,5,4,3,3,3,3,2,2
Jørgen Marcussen,72,72,14,20,38,5,52,-4,-6,0,0,72,7,1.6,1.5,4,"stage Giro d'Italia  ('80)
3rd
World Championships - Road Race  ('78)
4th
GC Vuelta a Espa–a  ('81)",7,7,7,6,6,6,5,5,5,4,4,3,3,3,2,7,7,6,6,6,6,5,5,4,4,4,3,3,3,3
Jørgen V Petersen,72,66,13,18,35,4,50,-3,-5,2,-2,64,4,1.4,1.5,4,"stage Tour de France  ('85)
8th Giro di Lombardia  ('84)
Klasika Primavera de Amorebieta  ('88)",7,7,6,6,6,5,5,5,4,4,4,4,3,3,3,7,6,6,6,5,5,5,4,4,4,3,3,3,3,2
Kasper Asgreen,80,65,13,18,35,4,54,+6,4,2,6,71,4,1.3,1.5,5,"Ronde van Vlaanderen - Tour des Flandres ME  ('21)

E3 Saxo Bank Classic  ('21)

Kuurne-Bruxelles-Kuurne  ('20)",7,7,7,6,6,6,6,6,5,5,5,4,4,3,3,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2
Kim Andersen,70,70,15,21,37,5,48,-1,-3,5,1,71,8,1.8,1.6,6,"La Fl�che Wallonne  ('84)

stage Tour de France  ('83)

GP Monaco  ('83)",8,7,7,6,6,5,5,4,4,4,3,3,3,3,2,8,7,6,6,5,5,5,5,4,4,4,3,3,3,2
Koen de Kort,68,61,12,18,32,3,46,-1,-2,1,1,62,5,1.5,1.3,4,"GP Eddy Merckx  ('04)
16th
World Championships - Road Race  ('12)

stage Tour de l'Avenir  ('05)",7,7,6,6,6,5,5,4,4,4,4,3,3,3,2,6,6,6,5,5,4,4,4,4,4,3,3,3,2,2
Kurt Asle Arvesen,70,65,13,19,35,4,49,+1,0,3,3,68,8,1.8,1.5,5,"2x
GC Post Danmark Rundt  ('07, '04)
2x
stage Giro d'Italia  ('07, '03)

5x
National Championships Norway - Road Race  ('09, '08, '02, '98, '97)",7,7,7,6,6,6,5,5,4,4,3,3,3,2,2,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2
Lars Bak,73,69,13,18,36,4,49,+1,-1,1,-6,63,5,1.5,1.5,2,"GP de Fourmies - La Voix du Nord  ('12)

stage Giro d'Italia  ('12)

GC Tour de l'Avenir  ('05)",7,7,6,6,6,6,5,5,5,5,4,4,3,3,2,7,6,6,6,6,5,5,5,4,4,4,3,3,3,2
Lars Michaelsen,69,60,12,18,32,3,40,+7,5,6,2,62,5,1.6,1.4,3,"Gent - Wevelgem  ('95)

stage Vuelta a Espa–a  ('97)

GC Tour of Qatar  ('05)",7,7,6,6,6,5,5,5,4,4,3,3,3,3,2,6,6,6,5,5,4,4,4,4,4,3,3,2,2,2
Lars Petter Nordhaug,63,66,14,19,35,4,42,+0,-1,0,5,71,8,1.7,1.4,4,"Grand Prix Cycliste de MontrŽal  ('12)

GC Tour de Yorkshire  ('15)

6th
GC Vuelta Ciclista al Pais Vasco  ('12)",7,7,6,6,5,5,4,4,3,3,3,3,3,2,2,7,7,5,5,5,5,5,4,4,4,4,3,3,3,2
Leif Mortensen,71,74,15,21,39,6,50,-2,-4,1,1,75,6,1.6,1.5,4,"Trofeo Baracchi  ('71)
2nd
World Championships - Road Race  ('70)

6th
GC Tour de France  ('71)",7,7,7,6,6,5,5,5,4,4,4,3,3,3,2,8,7,6,6,6,6,5,5,4,4,4,4,3,3,3
Mads Pedersen,25,74,65,14,20,34,4,50,6,4,6,9,74,7,1.6,1.4,7,"XXX",7,7,7,6,6,6,5,5,5,4,4,4,3,3,2,7,7,6,5,5,4,4,4,4,4,4,3,3,3,2
Magnus Bäckstedt,79,60,12,17,32,3,51,+7,5,6,0,60,3,1.3,1.3,3,"Paris - Roubaix  ('04)

stage Tour de France  ('98)
2nd
Gent - Wevelgem  ('04)",7,7,7,6,6,6,6,5,5,5,4,4,4,4,3,6,6,5,5,5,5,4,4,4,3,3,3,3,2,2
Magnus Cort,70,65,14,19,35,4,50,0,-2,7,1,66,6,1.7,1.4,7,"6x
stage Vuelta a Espa–a  ('21, '20, '16)
2x
stage Tour de France  ('22, '18)
2x
stage Paris - Nice  ('21, '19)",7,7,7,6,6,6,5,5,4,4,3,3,3,3,2,7,7,5,5,5,5,4,4,4,4,4,3,3,3,2
Matti Breschel,65,62,14,19,33,3,40,+3,2,4,8,70,7,1.8,1.6,5,"9x
stage Post Danmark Rundt-Tour of Denmark  ('15, '13, '10, '09, '08, '07)
2nd
World Championships - Road Race  ('10)

3rd
World Championships - Road Race  ('08)",7,7,7,6,6,5,4,4,3,3,3,3,3,2,2,8,6,5,5,5,4,5,4,4,3,3,3,3,2,2
Michael Blaudzun,72,65,13,18,34,3,50,-2,-4,1,-2,63,3,1.3,1.5,2,"GC International Hessen Rundfahrt  ('01)

GC Tour of Sweden  ('96)

Grand Prix Herning  ('05)",7,6,6,6,6,5,5,5,5,4,4,4,3,3,3,7,6,6,5,5,5,5,5,4,4,3,3,3,2,2
Michael Mørkøv,67,59,12,17,31,2,44,+2,0,6,0,59,4,1.4,1.3,2,"stage Vuelta a Espa–a  ('13)
2nd
Paris - Tours  ('13)

3x
National Championships Denmark - Road Race  ('19, '18, '13)",7,6,6,6,5,5,5,4,4,4,4,3,3,3,2,6,6,5,5,5,4,4,4,4,3,3,3,3,2,2
Michael Rasmussen,65,77,15,21,40,6,45,-1,-3,-1,-6,71,4,1.5,1.4,7,"GC Tour de Fran ('07)
4x
stage Tour de France  ('07, '06, '05)
2x
KOM Tour de France  ('06, '05)",7,7,6,6,5,5,4,4,4,4,3,3,3,3,2,8,7,6,6,6,6,5,5,5,5,4,4,4,3,3
Michael Sandstød,72,56,12,17,30,2,51,-1,-2,4,1,57,6,1.6,1.3,2,"GC 4 Jours de Dunkerque / Tour du Nord-pas-de-Calais  ('99)
2x
GC Tour de Picardie  ('02, '00)
2x
Grand Prix Midtbank  ('00, '99)",7,7,7,6,6,6,5,5,4,4,4,3,3,3,3,6,6,5,5,4,4,4,4,3,3,3,3,2,2,2
Michael Valgren,70,63,14,20,34,4,47,+4,2,1,10,73,7,1.6,1.6,5,"Amstel Gold Race  ('18)

Omloop Het Nieuwsblad ME  ('18)
2x
GC PostNord Danmark Rundt - Tour of Denmark  ('16, '14)",8,7,6,6,5,5,5,4,4,4,4,4,3,3,2,7,7,6,5,5,4,4,4,4,4,3,3,3,2,2
Mikkel Honore,67,66,13,19,35,4,44,0,-2,2,1,67,4,1.4,1.5,4," 3rd
Bretagne Classic - Ouest-France  ('21)
3rd
Donostia San Sebastian Klasikoa  ('21)
5th
GC Tour de Pologne  ('21)",7,6,6,6,5,5,5,4,4,4,4,3,3,3,2,7,6,6,6,5,5,5,4,4,4,3,3,3,3,2
Nicki Sørensen,68,69,13,19,36,4,44,-1,-3,2,-3,66,6,1.6,1.5,5,"stage Tour de France  ('09)

stage Vuelta a Espa–a  ('05)

4x
National Championships Denmark - Road Race  ('11, '10, '08, '03)",7,7,6,6,6,5,5,4,4,4,3,3,3,3,2,7,6,6,6,6,5,5,5,4,4,4,3,3,3,2
Niklas Axelsson,71,70,14,19,37,5,48,-4,-6,1,-2,68,4,1.4,1.5,2,"3rd Giro di Lombardia  ('00)
6th GC Giro d'Italia  ('99)
5th GC Tirreno-Adriatico  ('08)",7,7,6,6,6,5,5,5,4,4,4,3,3,3,3,7,7,6,6,6,5,5,5,4,4,4,3,3,3,2
Ole Ritter,77,73,14,19,38,5,53,-1,-3,3,-5,68,4,1.5,1.5,2,"7th
GC Giro d'Italia  ('73)
3x
stage Giro d'Italia  ('71, '69, '67)
2x
GP Lugano  ('74, '70)",7,7,7,6,6,6,6,5,5,5,4,4,3,3,3,7,7,6,6,6,6,5,5,5,4,4,4,3,3,2
Peter Meinert,73,69,13,18,36,4,52,-3,-5,1,-5,64,5,1.4,1.5,2,"2nd
GC Ronde van Nederland  ('97)
6th
GC Tour de Romandie  ('97)
2nd
GC Danmark Rundt  ('97)",7,7,7,6,6,5,5,5,5,4,4,4,3,3,3,7,6,6,6,6,5,5,5,4,4,4,4,3,2,2
Remco Evenepoel,82,77,16,24,39,6,55,-6,-7,3,2,77,4,1.4,1.8,7,"GC La Vuelta ciclista a Espa–a  ('22)
2x
Donostia San Sebastian Klasika  ('22, '19)

World Championships ME - Road Race  ('22)",8,7,7,6,6,6,6,5,5,5,5,5,4,4,3,8,8,7,6,6,5,5,5,5,4,4,4,4,3,3
Rigoberto Uran Uran,72,77,16,23,40,7,52,-6,-7,0,-1,76,5,1.5,1.6,6,"Grand Prix Cycliste de QuŽbec  ('15)
2nd
GC Tour de France  ('17)
2x 2nd
GC Giro d'Italia  ('14, '13)",7,7,7,6,5,5,5,5,5,4,4,4,3,3,2,8,8,7,6,6,5,5,5,5,4,4,4,4,3,3
Rolf Sørensen,75,72,16,23,38,5,52,+1,6,6,7,79,8,1.9,1.8,6,"2x
GC Tirreno-Adriatico  ('92, '87)

Li�ge - Bastogne - Li�ge  ('93)

Ronde van Vlaanderen / Tour des Flandres  ('97)",8,7,7,7,6,6,5,5,5,4,4,3,3,2,2,9,7,6,6,5,5,5,5,5,4,4,4,3,2,2
Sandy Casar,67,74,14,19,39,6,48,-1,-2,4,-6,68,4,1.3,1.4,3,"3x
stage Tour de France  ('10, '09, '07)
2nd
GC Paris - Nice  ('02)

GC La Route du Sud Cycliste - La DŽp�che du Midi  ('05)",7,6,6,6,5,5,5,4,4,4,4,3,3,3,3,7,7,6,6,6,6,6,5,4,4,4,4,3,3,3
Sonny Colbrelli,71,62,13,18,33,3,46,+9,7,6,5,67,6,1.7,1.5,5,"Paris-Roubaix  ('21)

GC Benelux Tour  ('21)
2x
Gran Premio Bruno Beghelli  ('19, '15)",7,7,7,6,6,6,5,4,4,4,4,3,3,3,2,7,6,5,5,5,5,5,4,4,4,3,3,2,2,2
Søren Kragh Andersen,73,65,13,19,35,4,52,+0,-1,2,3,68,8,1.7,1.5,6,"2x
stage Tour de France  ('20)

Paris - Tours Elite  ('18)
2nd
GC BinckBank Tour  ('20)",8,7,7,6,6,6,5,5,4,4,4,3,3,3,3,7,6,6,6,5,5,5,4,4,4,3,3,3,2,2
Søren Lilholt,69,62,13,18,33,3,48,+3,2,2,1,63,8,1.9,1.4,4,"E3-Prijs Harelbeke  ('90)

GC Tour de Luxembourg  ('87)

GC Tour d'Armorique  ('88)",7,7,7,6,6,6,5,5,4,4,3,3,2,2,2,7,6,5,5,5,5,4,4,4,4,3,3,3,2,2
Taylor Phinney,78,60,13,18,32,3,55,-3,-4,5,5,65,4,1.5,1.5,1,"stage Giro d'Italia  ('12)
2nd
World Championships - ITT  ('12)

GC Dubai Tour  ('14)",7,7,7,7,6,6,6,5,5,5,5,4,3,3,3,7,6,6,5,4,4,4,4,4,3,3,3,3,2,2
Thierry Claveyrolat,64,71,14,20,37,5,44,0,-2,0,0,71,5,1.4,1.5,6,"5x
stage CritŽrium du DauphinŽ LibŽrŽ  ('90, '89, '87, '86)
2x
stage Tour de France  ('91, '90)

KOM Tour de France  ('90)",7,6,6,6,5,5,4,4,4,4,3,3,3,3,2,7,7,6,6,6,5,5,5,5,4,4,3,3,3,2
Thomas Löfkvist,71,71,14,19,37,5,49,-4,-5,1,-3,68,4,1.4,1.5,2,"2nd
GC Deutschland Tour  ('08)

GC Tour MŽditerranŽen Cycliste Professionnel  ('13)

3rd
GC Tirreno-Adriatico  ('08)",7,7,6,6,6,5,5,4,4,4,4,4,3,3,3,7,7,6,6,6,5,5,5,4,4,4,4,3,3,2
Thor Hushovd,76,56,13,18,30,2,51,+5,7,10,8,64,5,1.4,1.4,1,"10x
stage Tour de France  ('11, '10, '09, '08, '07, '06, '04, '02)

World Championships - Road Race  ('10)

Gent - Wevelgem  ('06)",7,7,7,6,6,6,5,5,5,4,4,4,4,3,3,7,6,5,4,4,4,4,4,3,3,3,3,2,2,2
Tobias Foss,76,68,13,18,36,4,54,-5,-6,0,-5,63,4,1.4,1.5,1,"World Championships ME - ITT  ('22)
9th
GC Giro d'Italia  ('21)
2x
National Championships Norway - ITT  ('22, '21)",7,7,7,6,6,6,5,5,5,4,4,4,4,3,3,6,6,6,6,6,6,5,5,4,4,3,3,3,3,2
Tommy Prim,73,76,15,22,40,6,52,-5,-7,1,-2,74,6,1.5,1.5,3,"GC Tirreno-Adriatico  ('84)

GC Tour de Romandie  ('81)
3x
GC Cronostaffetta  ('81, '80)",7,7,7,6,6,6,5,5,5,4,4,3,3,3,3,8,7,7,6,6,6,5,5,4,4,4,4,4,3,3
Zbigniew Spruch,65,66,14,19,35,4,40,+4,2,4,1,67,5,1.6,1.6,4,"2nd
World Championships - Road Race  ('00)
2nd
Gent - Wevelgem  ('99)
3rd
Milano-Sanremo  ('99)",7,7,6,6,5,5,4,4,4,3,3,3,3,3,2,7,7,6,5,5,5,5,5,4,4,3,3,3,2,2
Mattias Skjelmose,69,72,15,21,38,5,49,-4,-6,3,1,73,4,1.4,1.6,5," xxx",7,7,6,6,5,5,5,4,4,4,4,3,3,3,3,8,7,6,6,6,5,5,5,4,4,4,3,3,3,3

Mikkel Bjerg,75,64,12,18,34,3,51,0,-2,1,1,65,4,1.5,1.2,3," xxx",7,7,7,6,6,6,5,5,5,4,4,4,3,3,3,6,6,6,5,5,5,4,4,4,4,3,3,3,3,3

Tobias Lund Andresen,63,57,12,17,31,0,41,3,1,6,2,59,2,1.2,1.4,2,"xxx",6,6,6,5,5,5,4,4,4,3,3,3,3,3,36,6,5,5,5,4,4,4,3,3,3,3,2,2,2

Andreas Kron,63,64,13,18,34,3,42,1,-1,3,2,66,6,1.6,1.5,4,"xxx",7.0,6.0,6.0,6.0,5.0,5.0,4.0,4,4,3,3,3,3,2,2,7.0,6.0,5.0,6.0,5.0,4.0,5,5,4,4,3,3,3,2,2

Anton Charmig,62,61,13,18,32,3,40,1,-1,2,3,64,3,1.3,1.4,5,"xxx",6.0,6.0,6.0,5.0,5.0,5.0,4.0,4,4,3,3,3,3,3,2,7.0,6.0,5.0,5.0,5.0,4.0,4,4,4,4,3,3,3,2,2

`;

function parseCSV(text) {
  const s = text.replace(/\r\n/g, '\n');
  const rows = [];
  let cur = '';
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (inQuotes && s[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (!inQuotes && ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  // push last
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toNumber(v) {
  if (v === undefined || v === null) return 0;
  const original = v;
  const cleaned = ('' + v).trim().replace(/[^0-9\-\.]/g, '');
  if (cleaned === '') {
    // if empty after cleaning, log the original value at debug level so we
    // can inspect what was present before it became 0
    console.debug && console.debug('ridersCsv.toNumber -> converted to 0 (empty after cleaning). original=', JSON.stringify(original));
    return 0;
  }
  const n = Number(cleaned);
  if (Number.isFinite(n)) {
    // If the numeric conversion yields 0 or 1, log the original value so
    // the caller can see what text produced the boolean-y values.
    if (n === 0 || n === 1) {
      console.debug && console.debug('ridersCsv.toNumber ->', n, 'original=', JSON.stringify(original), 'cleaned=', cleaned);
    }
    return n;
  }
  console.debug && console.debug('ridersCsv.toNumber -> non-finite conversion, original=', JSON.stringify(original), 'cleaned=', cleaned);
  return 0;
}

const rawRows = parseCSV(csvText);
if (rawRows.length < 2) {
  console.warn('ridersCsv: no rows parsed');
}

const header = rawRows[0].map(h => (h || '').trim());
const dataRows = rawRows.slice(1).filter(r => r.some(c => (c || '').trim() !== ''));

const riders = dataRows.map(cols => {
  const row = {};
  for (let i = 0; i < header.length; i++) {
    row[header[i]] = (cols[i] || '').trim();
  }
  const out = {};
  out.NAVN = row['NAVN'] || '';
  out.FLAD = toNumber(row['FLAD']);
  out.BJERG = toNumber(row['BJERG']);
  out.BROSTEN = toNumber(row['BROSTEN']);
  out.PUNCHEUR = toNumber(row['PUNCHEUR']);
  out.SPRINT = toNumber(row['SPRINT']);
  out.MENTALITET = toNumber(row['MENTALITET']);
  // copy FLAD1..FLAD15 and BJERG1..BJERG15
  for (let i = 1; i <= 15; i++) {
    out[`FLAD${i}`] = toNumber(row[`FLAD${i}`]);
    out[`BJERG${i}`] = toNumber(row[`BJERG${i}`]);
  }
  return out;
});

export default riders;
