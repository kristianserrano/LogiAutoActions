namespace Loupedeck.Test4Plugin
{
    using System;

    public class LocalizationDynamicCommand3 : PluginDynamicCommand
    {
        public LocalizationDynamicCommand3()
            : base("##ExampleActionName", "##ExampleActionDescription", "##ExampleGroupName")
        {
        }
    }
}
