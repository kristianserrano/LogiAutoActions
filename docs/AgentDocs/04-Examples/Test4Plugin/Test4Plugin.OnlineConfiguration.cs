namespace Loupedeck.Test4Plugin
{
    using System;

    public partial class Test4Plugin : Plugin
    {
        private const String ConfigFileName = "PluginConfig.json";

        private void LoadOnlineConfiguration()
        {
            // subscribe to file content received event
            this.ServiceEvents.OnlineFileContentReceived += this.OnOnlineFileContentReceived;

            // request file content
            this.ServiceEvents.GetOnlineFileContent(ConfigFileName);
        }

        private void UnloadOnlineConfiguration()
        {
            // unsubscribe from file content received event
            this.ServiceEvents.OnlineFileContentReceived -= this.OnOnlineFileContentReceived;
        }

        private void OnOnlineFileContentReceived(Object sender, OnlineFileContentReceivedEventArgs e)
        {
            if (e.FileName.EqualsNoCase(ConfigFileName))
            {
                // get file content
                var bytes = e.GetFileContent();

                if (null == bytes)
                {
                    // failed, use a backup approach (read file from embedded resources, etc.)
                }
                else
                {
                    // get JSON string from bytes
                    var json = System.Text.Encoding.UTF8.GetString(bytes);

                    // parse JSON string
                    if (JsonHelpers.TryDeserializeAnyObject<PluginConfig>(json, out var pluginConfig))
                    {
                        var portNumber = pluginConfig.PortNumber;
                        // use port number to start a TCP server
                    }
                    else
                    {
                        // failed, use a backup approach (read file from embedded resources, etc.)
                    }
                }
            }
        }

        // defines structure of PluginConfig.json file
        private class PluginConfig
        {
            public Int32 PortNumber { get; set; }
        }
    }
}
