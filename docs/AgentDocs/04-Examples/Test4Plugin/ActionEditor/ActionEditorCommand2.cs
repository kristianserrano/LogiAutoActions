namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommand2 : ActionEditorCommand
    {
        private const String MessageControlName = "message";

        public ActionEditorCommand2()
        {
            this.DisplayName = "Action Editor / Listbox";
            this.Description = "On creating a new action, listbox should be automatically selected to 'Example message 2'.";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: MessageControlName, labelText: "Select message:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (actionParameters.TryGetString(MessageControlName, out var message))
            {
                this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, message, null, null);
                return true;
            }

            return false;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(MessageControlName))
            {
                for (var i = 1; i <= 5; i++)
                {
                    e.AddItem(name: $"MESSAGE_ID_{i}", displayName: $"Example message {i}", description: null);
                }
            }

            e.SetSelectedItemName(e.Items[1].Name); // select second item
        }
    }
}
