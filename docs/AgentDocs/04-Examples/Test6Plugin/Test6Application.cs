namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Text.RegularExpressions;

    public class Test6Application : ClientApplication
    {
        public Test6Application()
        {
        }

        protected override Boolean IsProcessNameSupported(String processName)
        {
            if (Regex.IsMatch(processName, Helpers.IsWindows() ? "^lightroom$" : "^com.adobe.LightroomClassicCC7$", RegexOptions.IgnoreCase))
            {
                this.Plugin.PluginEvents.RaiseEvent("LightroomFocus");
            }
            else if (Regex.IsMatch(processName, Helpers.IsWindows() ? "^photoshop$" : "^com.adobe.Photoshop$", RegexOptions.IgnoreCase))
            {
                this.Plugin.PluginEvents.RaiseEvent("PhotoshopFocus");
            }

            return false;
        }
    }
}