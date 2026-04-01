namespace Loupedeck.Test4Plugin
{
    using System;

    using Loupedeck.Service;

    public class MessageCenterProfileCommand : PluginDynamicCommand
    {
        private const Char ParameterSeparator = '_';

        public MessageCenterProfileCommand()
        {
            this.DisplayName = "Message Center";
            this.GroupName = "Message Center Test";

            this.MakeProfileAction("tree");
        }

        protected override PluginProfileActionData GetProfileActionData()
        {
            // create tree data

            var tree = new PluginProfileActionTree("Create Message Center item:");

            // describe levels

            tree.AddLevel("Severity");
            tree.AddLevel("Message");

            // add data tree

            foreach (var severity in new[] { LoupedeckMessageCenterItemSeverity.Normal, LoupedeckMessageCenterItemSeverity.Warning, LoupedeckMessageCenterItemSeverity.Error, LoupedeckMessageCenterItemSeverity.Hint })
            {
                var node = tree.Root.AddNode(severity.ToString());

                for (var messageId = 1; messageId <= 9; messageId++)
                {
                    node.AddItem($"{(Int32)severity}{ParameterSeparator}{messageId}", this.MakeDisplayName(severity, messageId), null);
                }
            }

            // return tree data

            return tree;
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => this.TryParseParameter(actionParameter, out var severity, out var messageId) ? this.MakeDisplayName(severity, messageId) : null;

        protected override void RunCommand(String actionParameter)
        {
            if (this.TryParseParameter(actionParameter, out var severity, out var messageId))
            {
                var name = Test4Plugin.LoupedeckService.MessageCenter.AddItem(severity, this.MakeDisplayName(severity, messageId), "Message Center Test", "https://support.loupedeck.com/");
                Tracer.Trace($"Message '{actionParameter}' added as '{name}'");
            }
            else
            {
                Tracer.Error($"Message '{actionParameter}' noy parsed");
            }
        }

        private String MakeDisplayName(LoupedeckMessageCenterItemSeverity severity, Int32 messageId) => $"{severity} message {messageId}";

        private Boolean TryParseParameter(String actionParameter, out LoupedeckMessageCenterItemSeverity severity, out Int32 messageId)
        {
            var parts = actionParameter.SplitCsv(ParameterSeparator);

            if ((2 == parts.Length) && Int32.TryParse(parts[0], out var severityCode) && Int32.TryParse(parts[1], out messageId))
            {
                severity = (LoupedeckMessageCenterItemSeverity)severityCode;
                return true;
            }

            severity = LoupedeckMessageCenterItemSeverity.None;
            messageId = -1;
            return false;
        }
    }
}
