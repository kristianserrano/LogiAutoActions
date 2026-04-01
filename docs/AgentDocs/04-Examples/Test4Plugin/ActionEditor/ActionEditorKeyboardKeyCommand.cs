namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorKeyboardKeyCommand : ActionEditorCommand
    {
        private const String KeyboardKeyControlName = "KeyboardKey";

        public ActionEditorKeyboardKeyCommand()
        {
            this.DisplayName = "Action Editor / KeyboardKey";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorKeyboardKey(name: KeyboardKeyControlName, labelText: "Key")
                .SetBehavior(ActionEditorKeyboardKeyBehavior.KeyboardKey));
        }
    }
}
