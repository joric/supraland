@echo off

set choice=3

echo 1) Supraland
echo 2) Supraland Crash
echo 3) Supraland Six Inches Under

set /p choice=Enter your choice. Enter - default (%choice%): 

set game=siu
if '%choice%'=='1' set game=sl
if '%choice%'=='2' set game=slc
if '%choice%'=='3' set game=siu

set choice=3

echo 1) Export levels
echo 2) Export textures
echo 3) Export markers
echo 4) Generate tiles

set /p choice=Enter your choice. Enter - default (%choice%): 

set option=-m
if '%choice%'=='1' set option=-l
if '%choice%'=='2' set option=-t
if '%choice%'=='3' set option=-m
if '%choice%'=='4' goto tiles

py supraland_parser.py -g %game% %option%

exit

:tiles

echo generating tiles for %game%

# need map.jpg, 8192x8192, you can make it from exported textures

py gentiles.py -t jpg -w 512 map.jpg 0-4 tiles_dir
