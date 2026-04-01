namespace Loupedeck.Test6Plugin
{
    using System;

    public class HiddenDynamicAdjustmentToggleDynamicCommand : PluginDynamicCommand
    {
        public const String GroupNameAdjustment = "Test Hidden";
        public const String GroupNameResetCommand = "Test Hidden Reset";

        public HiddenDynamicAdjustmentToggleDynamicCommand()
            : base("Toggle Hidden Adjustments", "", "Toggle Hidden Adjustments")
        {
        }

        protected override void RunCommand(String actionParameter)
        {
            Tracer.Warning("--------------------------------------------------------------");
            foreach (var pluginAction in this.Plugin.GetActions())
            {
                if (pluginAction.GroupName.EqualsExactly(HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameAdjustment) || pluginAction.GroupName.EqualsExactly(HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameResetCommand))
                {
                    pluginAction.SetHidden(!pluginAction.IsHidden);
                    Tracer.Warning($"--- {(pluginAction.IsCommand ? "C" : "A")} ({pluginAction.GetType().Name}) {pluginAction.DisplayName}");
                }
                //Tracer.Warning($"    {(pluginAction.IsCommand ? "C" : "A")} ({pluginAction.GetType().Name}) {pluginAction.DisplayName}");
            }
            Tracer.Warning("--------------------------------------------------------------");

            this.Plugin.InvokeMethod("PluginActionsChanged", true, true);
        }
    }
}