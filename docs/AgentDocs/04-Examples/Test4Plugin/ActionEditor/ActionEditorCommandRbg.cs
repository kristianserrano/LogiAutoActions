namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommandRgb : ActionEditorCommand
    {
        private const String ListboxControlName = "color";

        public ActionEditorCommandRgb()
        {
            this.DisplayName = "Action Editor / Colors";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: ListboxControlName, labelText: "Select color:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override BitmapImage GetCommandImage(ActionEditorActionParameters actionParameters, Int32 imageWidth, Int32 imageHeight)
            => actionParameters.TryGetString(ListboxControlName, out var value)
                ? EmbeddedResources.ReadImage($"Loupedeck.Test4Plugin.ActionEditor.ActionEditorCommand{value}.png")
                : null;

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (actionParameters.TryGetString(ListboxControlName, out var value))
            {
                this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Color is '{value}'", null, null);
                return true;
            }

            return false;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            e.AddItem(name: "Red", displayName: "Red", description: null);
            e.AddItem(name: "Green", displayName: "Green", description: null);
            e.AddItem(name: "Blue", displayName: "Blue", description: null);
        }
    }
}
