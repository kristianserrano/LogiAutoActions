namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Text;

    public class OnlineFileDynamicCommand : PluginDynamicCommand
    {
        private String _displayName = "";

        // https://ldbackend.blob.core.windows.net/plugins/Test4/PluginConfig.json
        //
        // PluginConfig.json file content:
        //
        // {
        //     "message": "All OK"
        // }


        public OnlineFileDynamicCommand() : base("Online command", "", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this.Plugin.ServiceEvents.OnlineFileContentReceived += this.OnOnlineFileContentReceived;
            return true;
        }

        protected override Boolean OnUnload()
        {
            this.Plugin.ServiceEvents.OnlineFileContentReceived -= this.OnOnlineFileContentReceived;
            return true;
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"File:\n'{this._displayName}'";

        protected override void RunCommand(String actionParameter)
        {
            this.Plugin.ServiceEvents.GetOnlineFileContent("PluginConfig.json");
            this._displayName = "Requested";
            this.ActionImageChanged();
        }

        private void OnOnlineFileContentReceived(Object sender, OnlineFileContentReceivedEventArgs e)
        {
            var bytes = e.GetFileContent();

            if (null == bytes)
            {
                this._displayName = "Error 1";
            }
            else
            {
                var json = Encoding.UTF8.GetString(bytes);

                if (JsonHelpers.TryDeserializeAnyObject<PluginConfig>(json, out var pluginConfig))
                {
                    this._displayName = pluginConfig.Message;
                }
                else
                {
                    this._displayName = "Error 2";
                }
            }

            this.ActionImageChanged();
        }

        private class PluginConfig
        {
            public String Message { get; set; }
        }
    }
}
