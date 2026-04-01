namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommand1 : ActionEditorCommand
    {
        private const String MessageControlName = "message";

        public ActionEditorCommand1()
        {
            this.DisplayName = "Action Editor / Textbox";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: MessageControlName, labelText: "Enter message:")
                .SetMinLength(1)
                .SetMaxLength(80));

            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
            this.ActionEditor.ControlsStateRequested += this.OnActionEditorControlsStateRequested;
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

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(MessageControlName))
            {
                this.CheckMessage(e.ActionEditorState);
            }
        }

        private void OnActionEditorControlsStateRequested(Object sender, ActionEditorControlsStateRequestedEventArgs e) => this.CheckMessage(e.ActionEditorState);

        private void CheckMessage(ActionEditorState actionEditorState)
        {
            // don't allow dirty language in mesage text
            var notValid = true == actionEditorState.GetControlValue(MessageControlName)?.ContainsNoCase("f*ck");
            actionEditorState.SetValidity(MessageControlName, !notValid, notValid ? "Dirty language is not allowed" : null);
        }
    }
}
