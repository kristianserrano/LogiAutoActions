namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommand3 : ActionEditorCommand
    {
        private const String MessageTextControlName = "message-text";
        private const String MessageRecipientControlName = "recipient";
        private const String MessageDeliveryConfirmationControlName = "delivery-confirmation";
        private const String MessageAttachmentControlName = "attachment";

        public ActionEditorCommand3()
        {
            this.DisplayName = "Action Editor / Multiple";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: MessageTextControlName, labelText: "Enter message:")
                .SetRequired()
                .SetMaxLength(80)
                .SetRegex("^-?[0-9]+$"));
            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: MessageRecipientControlName, labelText: "Select recipient:"));
            this.ActionEditor.AddControl(
                new ActionEditorCheckbox(name: MessageDeliveryConfirmationControlName, labelText: "Require delivery confirmation")
                    .SetDefaultValue(true)
                );
            this.ActionEditor.AddControl(
                new ActionEditorFileSelector(name: MessageAttachmentControlName, labelText: "Select file to attach:")
                    .AddFilter("*.mpeg;*.mpeg4", "MPEG Files")
                    .AddFilter("*.*", "All Files")
                    .SetInitialDirectory("%UserProfile%")
                );

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            var message = new Message(
                    messageText: actionParameters.GetString(MessageTextControlName),
                    recipient: actionParameters.GetString(MessageRecipientControlName),
                    deliveryConfirmation: actionParameters.GetBoolean(MessageDeliveryConfirmationControlName));
                    
            message.AddAttachment(filePath: actionParameters.GetString(MessageAttachmentControlName));

            message.Send();

            return true;
        }

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(MessageTextControlName))
            {
                // don't allow dirty language in mesage text
                var isValid = e.ActionEditorState.GetControlValue(MessageTextControlName).ContainsNoCase("f*ck");
                e.ActionEditorState.SetValidity(MessageTextControlName, isValid, "Dirty language is not allowed");
            }
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(MessageRecipientControlName))
            {
                for (var i = 1; i <= 5; i++)
                {
                    e.AddItem(name: $"RECIPIENT_{i}", displayName: $"Message recepient {i}", description: null);
                }
            }
        }

        private class Message
        {
            public Message(String messageText, String recipient, Boolean deliveryConfirmation)
            {
            }

            public void AddAttachment(String filePath)
            {
            }

            public void Send()
            {
            }
        }
    }
}
