@echo off

echo === POSTBUILD STARTED

set projectDirectory=%1
set outputDirectory=%2
set configuration=%3
set pluginName=%4
set pluginName=%pluginName:~0,-6%
set pluginTool=%outputDirectory%..\LogiPluginSdk\LogiPluginTool.exe

echo --- Variables

echo projectDirectory="%projectDirectory%"
echo outputDirectory="%outputDirectory%"
echo configuration="%configuration%"
echo pluginName="%pluginName%"
echo pluginTool="%pluginTool%"

if not exist %pluginTool% (
    echo Not found: %pluginTool%
    exit /b 1
)

set lplug4Directory=%projectDirectory%lplug4\
echo --- Copy plugin package files "%lplug4Directory%" to "%outputDirectory%"
xcopy /e /i /s /y "%lplug4Directory%" "%outputDirectory%"

echo -- Create LPLUG4 file

echo RUNNING COMMAND: "%pluginTool%" pack "%outputDirectory% " "%outputDirectory%..\%pluginName%.lplug4"
"%pluginTool%" pack "%outputDirectory% " "%outputDirectory%..\%pluginName%.lplug4"

echo -- Create link file

set linkFile=%LocalAppData%\Logi\LogiPluginService\Plugins\%pluginName%.link"
if "%configuration%" == "Debug" (
	echo --- Create link file "%linkFile%"
	echo %outputDirectory% > "%linkFile%"
)

echo === POSTBUILD ENDED
