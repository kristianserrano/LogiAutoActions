namespace Loupedeck.Test6Plugin
{
    using System;

    internal class ActionIconDynamicCommand1 : PluginDynamicCommand
    {
        public ActionIconDynamicCommand1()
            : base("Action Icon 1", "Action Icon 1 description", "Action Icon")
        {
        }

        protected override BitmapImage GetCommandImage(String actionParameter, PluginImageSize imageSize) => BitmapImage.FromResource(this.Plugin.Assembly, "Loupedeck.Test6Plugin.ActionIcon.ActionIconDynamicCommand1.svg");
    }
}