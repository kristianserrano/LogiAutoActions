namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Net;

    public class UrlCallbackDynamicCommand : PluginDynamicCommand
    {
        private String _displayName = "";

        // loupedeck:plugin/Test4/callback/setDisplayName?Hi!

        public UrlCallbackDynamicCommand() : base("URL Callback", "", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this.Plugin.ServiceEvents.UrlCallbackReceived += this.OnUrlCallbackReceived;
            return true;
        }

        protected override Boolean OnUnload()
        {
            this.Plugin.ServiceEvents.UrlCallbackReceived -= this.OnUrlCallbackReceived;
            return true;
        }

        private void OnUrlCallbackReceived(Object sender, UrlCallbackReceivedEventArgs e)
        {
            if ((e.Uri != null) && e.Uri.LocalPath.EndsWithNoCase("/setDisplayName") && !String.IsNullOrEmpty(e.Uri.Query))
            {
                this._displayName = WebUtility.UrlDecode(e.Uri.Query.Substring(1));
                this.ActionImageChanged();
            }
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"Callback:\n'{this._displayName}'";

        protected override void RunCommand(String actionParameter)
        {
            this._displayName = "";
            this.ActionImageChanged();
        }
    }
}
