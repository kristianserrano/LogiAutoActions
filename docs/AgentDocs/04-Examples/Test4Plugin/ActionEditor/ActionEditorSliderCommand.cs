namespace Loupedeck.Test4Plugin
{
    public class ActionEditorSliderCommand : ActionEditorCommand
    {
        public ActionEditorSliderCommand()
        {
            this.DisplayName = "Action Editor / Slider";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControlEx(new ActionEditorSlider(name: "Slider1", labelText: "Slider 1", description: "Slider from 0% to 100% default 0 step 1% format '{0}%'"))
                .SetValues(0, 100, 0, 1)
                .SetFormatString("{0}%");

            this.ActionEditor.AddControlEx(new ActionEditorSlider(name: "Slider2", labelText: "Slider 2", description: "Slider from -100 to 100 default 0 step 10"))
                .SetValues(-100, 100, 0, 10);

            this.ActionEditor.AddControlEx(new ActionEditorSlider(name: "Slider3", labelText: "Slider 3", description: "Slider from 0.0 to 100.0 default 0.0 step 0.2 format '{3}ms'"))
                .SetValues(0.0, 100.0, 0.0, 0.2)
                .SetFormatString("{3}ms");

            this.ActionEditor.AddControlEx(new ActionEditorSlider(name: "Slider4", labelText: "Slider 4", description: "Slider from -100.0 to 100.0 default 0.0 step 2.5"))
                .SetValues(-100.0, 100.0, 0.0, 2.5);

            this.ActionEditor.AddControlEx(new ActionEditorSlider(name: "Slider5", labelText: "Slider 4", description: "Slider from 0.0 to 1.0 default 0.0 step 0.01 format '{1}°C'"))
                .SetValues(0.0, 1.0, 0.0, 0.01)
                .SetFormatString("{1}°C");
        }
    }
}
